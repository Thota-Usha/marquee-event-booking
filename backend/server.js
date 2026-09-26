const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]?.trim());
if (missingEnv.length) {
  console.error(`Missing required environment values: ${missingEnv.join(", ")}`);
  console.error("Add them to backend/.env and restart the server.");
  process.exit(1);
}

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "https://melodic-blancmange-968b0a.netlify.app",
  ...(process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
]);
app.use(cors({
  origin(origin, callback) {
    // Allow requests without an Origin header (for local tools/health checks).
    const isNetlifySite = origin && new URL(origin).hostname.endsWith(".netlify.app");
    if (!origin || allowedOrigins.has(origin) || isNetlifySite) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "event-booking-website")));

/* ================================
   SUPABASE CONNECTION
================================ */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ================================
   HOME
================================ */

app.get("/api/health", (req, res) => {
  res.json({ message: "Marquee Event Booking API is running" });
});

/* ================================
   TEST SUPABASE
================================ */

app.get("/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*");

    if (error) {
      return res.status(500).json({
        message: "Supabase connection failed",
        error: error.message
      });
    }

    res.json({
      message: "Supabase connected successfully",
      events: data
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   REGISTER
================================ */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters"
      });
    }

    const { data: existingUser, error: checkError } =
      await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (checkError) {
      return res.status(500).json({
        message: "Error checking user",
        error: checkError.message
      });
    }

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name: name,
          email: email,
          password: hashedPassword
        }
      ])
      .select("id, name, email")
      .single();

    if (error) {
      return res.status(500).json({
        message: "Registration failed",
        error: error.message
      });
    }

    res.status(201).json({
      message: "Registration successful",
      user: data
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   LOGIN
================================ */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        message: "Login failed",
        error: error.message
      });
    }

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   GET ALL EVENTS
================================ */

app.get("/api/events", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      return res.status(500).json({
        message: "Failed to fetch events",
        error: error.message
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   GET ONE EVENT
================================ */

app.get("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        message: "Event not found",
        error: error.message
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   CREATE BOOKING
================================ */

app.post("/api/bookings", async (req, res) => {
  try {
    const {
      user_id,
      event_id,
      seats_booked
    } = req.body;

    /* Validate input */

    if (!user_id || !event_id || !seats_booked) {
      return res.status(400).json({
        message: "user_id, event_id and seats_booked are required"
      });
    }

    if (Number(seats_booked) <= 0) {
      return res.status(400).json({
        message: "Seats booked must be greater than 0"
      });
    }

    /* Check user */

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    /* Check event */

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    /* Check seats */

    const seats = Number(seats_booked);
    const availableSeats = Number(event.available_seats);

    if (availableSeats < seats) {
      return res.status(400).json({
        message: "Not enough seats available",
        available_seats: availableSeats
      });
    }

    /* Insert booking */

    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .insert([
          {
            user_id: user_id,
            event_id: event_id,
            seats_booked: seats
          }
        ])
        .select()
        .single();

    if (bookingError) {
      return res.status(500).json({
        message: "Booking failed",
        error: bookingError.message
      });
    }

    /* Update available seats */

    const newAvailableSeats = availableSeats - seats;

    const { error: updateError } = await supabase
      .from("events")
      .update({
        available_seats: newAvailableSeats
      })
      .eq("id", event_id);

    if (updateError) {
      return res.status(500).json({
        message: "Booking created but seat update failed",
        error: updateError.message
      });
    }

    res.status(201).json({
      message: "Booking successful",
      booking: booking
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   GET USER BOOKINGS
================================ */

app.get("/api/bookings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        user_id,
        event_id,
        seats_booked,
        events (
          id,
          title,
          description,
          image_url,
          category,
          location,
          city,
          event_date,
          event_time,
          price,
          organizer
        )
      `)
      .eq("user_id", userId)
      .order("id", { ascending: false });

    if (error) {
      return res.status(500).json({
        message: "Failed to fetch bookings",
        error: error.message
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   CANCEL BOOKING
================================ */

app.delete("/api/bookings/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    /* Find booking */

    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    /* Get event */

    const { data: event, error: eventError } =
      await supabase
        .from("events")
        .select("available_seats")
        .eq("id", booking.event_id)
        .single();

    if (eventError || !event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    /* Restore seats */

    const restoredSeats =
      Number(event.available_seats) +
      Number(booking.seats_booked);

    await supabase
      .from("events")
      .update({
        available_seats: restoredSeats
      })
      .eq("id", booking.event_id);

    /* Delete booking */

    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (deleteError) {
      return res.status(500).json({
        message: "Failed to cancel booking",
        error: deleteError.message
      });
    }

    res.json({
      message: "Booking cancelled successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================================
   START SERVER
================================ */

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Website and API running at http://localhost:${PORT}`);
});
