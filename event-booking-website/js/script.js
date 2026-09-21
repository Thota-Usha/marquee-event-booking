/* =========================================================
   MARQUEE EVENT BOOKING WEBSITE
   COMPLETE FRONTEND SCRIPT
   Backend: Node.js + Express + Supabase
   API: http://localhost:5000
   ========================================================= */

const API = "http://localhost:5000";

let EVENTS = [];

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function qs(selector, parent = document) {
    return parent.querySelector(selector);
}

function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
}

function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function escapeHTML(value = "") {
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
}

/* =========================================================
   DATE / TIME / PRICE
   ========================================================= */

function formatDate(value) {
    if (!value) return "Date not available";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

function formatTime(value) {
    if (!value) return "Time not available";

    const parts = String(value).split(":");

    const hours = Number(parts[0]) || 0;
    const minutes = Number(parts[1]) || 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatPrice(value) {
    const price = Number(value) || 0;

    if (price === 0) {
        return "Free";
    }

    return "$" + price.toFixed(0);
}

function initials(name = "User") {
    return String(name)
        .trim()
        .split(/\s+/)
        .map(part => part[0] || "")
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

/* =========================================================
   EVENT NORMALIZATION
   ========================================================= */

function normalizeEvent(event) {
    return {
        id: event.id || event._id || "",
        title: event.title || "",
        description: event.description || "",
        category: event.category || "",

        image: event.image_url || event.image || "",

        date: event.event_date || event.date || "",

        time: event.event_time || event.time || "",

        endTime: event.end_time || event.endTime || "",

        city: event.city || "",

        venue: event.location || event.venue || "",

        price: Number(event.price) || 0,

        seatsAvailable: Number(
            event.available_seats ??
            event.seatsAvailable ??
            0
        ),

        totalSeats: Number(
            event.total_seats ??
            event.totalSeats ??
            0
        ),

        organizer: event.organizer || "Marquee Events",

        featured: Boolean(event.featured)
    };
}

/* =========================================================
   SEAT HELPERS
   ========================================================= */

function getEffectiveSeats(event) {
    if (!event) return 0;

    const seats = Number(event.seatsAvailable);

    return Number.isFinite(seats) ? seats : 0;
}

/* =========================================================
   EVENTS API
   ========================================================= */

async function getAllEvents() {
    try {
        const response = await fetch(API + "/api/events");

        if (!response.ok) {
            throw new Error("Events API error: " + response.status);
        }

        const data = await response.json();

        EVENTS = Array.isArray(data)
            ? data.map(normalizeEvent)
            : [];

        console.log("Events loaded:", EVENTS);

        return EVENTS;

    } catch (error) {
        console.error("Events API error:", error);

        EVENTS = [];

        return [];
    }
}

function getEvent(id) {
    return EVENTS.find(event =>
        String(event.id) === String(id)
    ) || null;
}

/* =========================================================
   USER AUTH
   ========================================================= */

function getCurrentUser() {
    try {
        return JSON.parse(
            localStorage.getItem("marquee_user") || "null"
        );
    } catch (error) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem(
        "marquee_user",
        JSON.stringify(user)
    );
}

function logoutUser() {
    localStorage.removeItem("marquee_user");
    localStorage.removeItem("marquee_token");
}

/* =========================================================
   REGISTER
   ========================================================= */

async function registerUser(name, email, password) {
    try {
        const response = await fetch(
            API + "/api/auth/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return {
                ok: false,
                error: data.message || "Registration failed"
            };
        }

        if (data.token) {
            localStorage.setItem(
                "marquee_token",
                data.token
            );
        }

        const user = data.user || {
            id: data.id,
            name,
            email
        };

        setCurrentUser(user);

        return {
            ok: true,
            user
        };

    } catch (error) {
        console.error("Registration error:", error);

        return {
            ok: false,
            error:
                "Cannot connect to backend. Make sure node server.js is running."
        };
    }
}

/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {
    try {
        const response = await fetch(
            API + "/api/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return {
                ok: false,
                error:
                    data.message ||
                    "Email or password is incorrect."
            };
        }

        if (data.token) {
            localStorage.setItem(
                "marquee_token",
                data.token
            );
        }

        const user = data.user || {
            id: data.id,
            name: email.split("@")[0],
            email
        };

        setCurrentUser(user);

        return {
            ok: true,
            user
        };

    } catch (error) {
        console.error("Login error:", error);

        return {
            ok: false,
            error:
                "Cannot connect to backend. Make sure node server.js is running."
        };
    }
}

/* =========================================================
   BOOKINGS API
   ========================================================= */

async function createBooking(userId, eventId) {
    try {
        const response = await fetch(
            API + "/api/bookings",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: userId,
                    event_id: eventId,
                    seats_booked: 1
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return {
                ok: false,
                error: data.message || "Booking failed"
            };
        }

        return {
            ok: true,
            booking: data.booking || data
        };

    } catch (error) {
        console.error("Booking error:", error);

        return {
            ok: false,
            error:
                "Cannot connect to backend. Make sure node server.js is running."
        };
    }
}

/* =========================================================
   GET USER BOOKINGS
   ========================================================= */

async function getUserBookings(userId) {
    try {
        const response = await fetch(
            API +
            "/api/bookings/user/" +
            encodeURIComponent(userId)
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch bookings"
            );
        }

        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error("Get bookings error:", error);
        return [];
    }
}

/* =========================================================
   GET ONE BOOKING
   ========================================================= */

async function getBookingById(bookingId) {
    const user = getCurrentUser();

    if (!user || !user.id) {
        return null;
    }

    const bookings = await getUserBookings(user.id);

    return bookings.find(booking =>
        String(
            booking.id ||
            booking.booking_id ||
            booking.bookingId
        ) === String(bookingId)
    ) || null;
}

/* =========================================================
   CHECK EXISTING BOOKING
   ========================================================= */

async function findActiveBooking(userId, eventId) {
    const bookings = await getUserBookings(userId);

    return bookings.find(booking =>
        String(booking.event_id) === String(eventId)
    ) || null;
}

/* =========================================================
   CANCEL BOOKING
   ========================================================= */

async function cancelBooking(bookingId) {
    try {
        const response = await fetch(
            API +
            "/api/bookings/" +
            encodeURIComponent(bookingId),
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return {
                ok: false,
                error:
                    data.message ||
                    "Failed to cancel booking"
            };
        }

        return {
            ok: true
        };

    } catch (error) {
        console.error("Cancel booking error:", error);

        return {
            ok: false,
            error: "Cannot connect to backend."
        };
    }
}

/* =========================================================
   ICONS
   ========================================================= */

const ICONS = {
    calendar: "📅",
    clock: "🕐",
    pin: "📍",
    ticket: "🎟️",
    check: "✓"
};

const CATEGORY_ICONS = {
    Technology: "💻",
    Music: "🎵",
    Workshop: "🎨",
    Sports: "🏃",
    Culture: "🎭"
};

/* =========================================================
   NAVBAR
   ========================================================= */

function initNav() {
    const user = getCurrentUser();

    const guestLinks = qs("#nav-guest");
    const userLinks = qs("#nav-user");

    if (user) {
        if (guestLinks) {
            guestLinks.hidden = true;
        }

        if (userLinks) {
            userLinks.hidden = false;

            const nameElement =
                qs("#nav-user-name", userLinks);

            const avatarElement =
                qs("#nav-user-avatar", userLinks);

            if (nameElement) {
                nameElement.textContent =
                    user.name || user.email;
            }

            if (avatarElement) {
                avatarElement.textContent =
                    initials(user.name || user.email);
            }
        }
    } else {
        if (guestLinks) {
            guestLinks.hidden = false;
        }

        if (userLinks) {
            userLinks.hidden = true;
        }
    }

    const logoutButton = qs("#logout-btn");

    if (logoutButton) {
        logoutButton.onclick = function () {
            logoutUser();
            window.location.href = "index.html";
        };
    }

    const year = qs("#footer-year");

    if (year) {
        year.textContent =
            new Date().getFullYear();
    }
}

/* =========================================================
   EVENT CARD
   ========================================================= */

function seatNoteHTML(event) {
    const seats = getEffectiveSeats(event);

    if (seats <= 0) {
        return (
            '<span class="seat-note is-soldout">' +
            "Sold out" +
            "</span>"
        );
    }

    if (seats <= 15) {
        return (
            '<span class="seat-note is-low">' +
            "Only " +
            seats +
            " seats left" +
            "</span>"
        );
    }

    return (
        '<span class="seat-note">' +
        seats +
        " seats left" +
        "</span>"
    );
}

function eventCardHTML(event) {
    return `
        <article class="event-card">

            <a class="event-card-media"
               href="event-details.html?id=${encodeURIComponent(event.id)}">

                <img
                    src="${escapeHTML(event.image)}"
                    alt="${escapeHTML(event.title)}"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >

                <span class="event-badge">
                    ${escapeHTML(event.category)}
                </span>

                <span class="event-price-tag">
                    ${formatPrice(event.price)}
                </span>

            </a>

            <div class="event-card-body">

                <h3>
                    <a href="event-details.html?id=${encodeURIComponent(event.id)}">
                        ${escapeHTML(event.title)}
                    </a>
                </h3>

                <div class="event-meta">

                    <span>
                        ${ICONS.calendar}
                        ${formatDate(event.date)}
                        ·
                        ${formatTime(event.time)}
                    </span>

                    <span>
                        ${ICONS.pin}
                        ${escapeHTML(event.city)}
                    </span>

                </div>

                <div class="event-card-footer">

                    ${seatNoteHTML(event)}

                    <a
                        class="btn btn-outline btn-sm"
                        href="event-details.html?id=${encodeURIComponent(event.id)}"
                    >
                        View details
                    </a>

                </div>

            </div>

        </article>
    `;
}

/* =========================================================
   RENDER EVENTS
   ========================================================= */

function renderEventGrid(container, events) {
    if (!container) return;

    container.classList.remove("skeleton-grid");
    container.classList.add("event-grid");

    if (!events.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎟️</div>
                <h3>No events found</h3>
                <p>
                    Try a different search term,
                    or clear your filters.
                </p>
            </div>
        `;
        return;
    }

    container.innerHTML =
        events.map(eventCardHTML).join("");
}

function renderSkeletonGrid(container, count = 6) {
    if (!container) return;

    let html = "";

    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-card">
                <div class="skeleton-media"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        `;
    }

    container.innerHTML = html;
    container.classList.add("skeleton-grid");
}

/* =========================================================
   HOME PAGE
   ========================================================= */

async function initHomePage() {
    const featuredGrid = qs("#featured-grid");
    const upcomingGrid = qs("#upcoming-grid");
    const categoryGrid = qs("#category-grid");

    const events = await getAllEvents();

    if (categoryGrid) {
        const categories = [
            ...new Set(
                events.map(event => event.category)
            )
        ].sort();

        categoryGrid.innerHTML =
            categories.map(category => {

                const count =
                    events.filter(
                        event =>
                            event.category === category
                    ).length;

                return `
                    <a
                        class="category-card"
                        href="events.html?category=${encodeURIComponent(category)}"
                    >

                        <span class="category-icon">
                            ${CATEGORY_ICONS[category] || "🎟️"}
                        </span>

                        <span>
                            ${escapeHTML(category)}
                        </span>

                        <small>
                            ${count}
                            event${count === 1 ? "" : "s"}
                        </small>

                    </a>
                `;
            }).join("");
    }

    const featuredEvents =
        events.filter(event => event.featured);

    renderEventGrid(
        featuredGrid,
        (
            featuredEvents.length
                ? featuredEvents
                : events
        ).slice(0, 3)
    );

    const today =
        new Date().toISOString().slice(0, 10);

    const upcoming =
        events
            .filter(event => event.date >= today)
            .sort((a, b) =>
                a.date.localeCompare(b.date)
            )
            .slice(0, 4);

    renderEventGrid(upcomingGrid, upcoming);

    const heroForm = qs("#hero-search-form");

    if (heroForm) {
        heroForm.onsubmit = function (event) {
            event.preventDefault();

            const search =
                qs("#hero-search-input")?.value.trim();

            const category =
                qs("#hero-category-select")?.value;

            const params = new URLSearchParams();

            if (search) {
                params.set("search", search);
            }

            if (category) {
                params.set("category", category);
            }

            window.location.href =
                "events.html" +
                (
                    params.toString()
                        ? "?" + params.toString()
                        : ""
                );
        };
    }
}

/* =========================================================
   EVENTS PAGE
   ========================================================= */

async function initEventsPage() {
    const grid = qs("#events-grid");

    if (!grid) return;

    const summary = qs("#results-summary");
    const searchInput = qs("#filter-search");
    const categorySelect = qs("#filter-category");
    const locationSelect = qs("#filter-location");
    const dateInput = qs("#filter-date");
    const sortSelect = qs("#filter-sort");
    const clearButton = qs("#filter-clear");

    renderSkeletonGrid(grid, 6);

    const events = await getAllEvents();

    if (categorySelect) {
        const categories = [
            ...new Set(
                events.map(event => event.category)
            )
        ].sort();

        categorySelect.innerHTML =
            '<option value="">All categories</option>' +
            categories.map(category =>
                `<option value="${escapeHTML(category)}">
                    ${escapeHTML(category)}
                </option>`
            ).join("");
    }

    if (locationSelect) {
        const locations = [
            ...new Set(
                events.map(event => event.city)
            )
        ].sort();

        locationSelect.innerHTML =
            '<option value="">All locations</option>' +
            locations.map(location =>
                `<option value="${escapeHTML(location)}">
                    ${escapeHTML(location)}
                </option>`
            ).join("");
    }

    if (searchInput) {
        searchInput.value =
            getParam("search") || "";
    }

    if (categorySelect) {
        categorySelect.value =
            getParam("category") || "";
    }

    if (locationSelect) {
        locationSelect.value =
            getParam("location") || "";
    }

    function applyFilters() {
        let filtered = events.slice();

        const search =
            searchInput?.value
                .trim()
                .toLowerCase() || "";

        const category =
            categorySelect?.value || "";

        const location =
            locationSelect?.value || "";

        const selectedDate =
            dateInput?.value || "";

        const sortBy =
            sortSelect?.value || "date-asc";

        if (search) {
            filtered = filtered.filter(event => {
                const text =
                    (
                        event.title +
                        " " +
                        event.city +
                        " " +
                        event.description
                    ).toLowerCase();

                return text.includes(search);
            });
        }

        if (category) {
            filtered =
                filtered.filter(
                    event =>
                        event.category === category
                );
        }

        if (location) {
            filtered =
                filtered.filter(
                    event =>
                        event.city === location
                );
        }

        if (selectedDate) {
            filtered =
                filtered.filter(
                    event =>
                        event.date >= selectedDate
                );
        }

        filtered.sort((a, b) => {
            if (sortBy === "price-asc") {
                return a.price - b.price;
            }

            if (sortBy === "price-desc") {
                return b.price - a.price;
            }

            if (sortBy === "name-asc") {
                return a.title.localeCompare(b.title);
            }

            return a.date.localeCompare(b.date);
        });

        renderEventGrid(grid, filtered);

        if (summary) {
            summary.innerHTML =
                `<strong>${filtered.length}</strong> events found`;
        }
    }

    [
        searchInput,
        categorySelect,
        locationSelect,
        dateInput,
        sortSelect
    ].forEach(element => {
        if (!element) return;

        element.addEventListener(
            "input",
            applyFilters
        );

        element.addEventListener(
            "change",
            applyFilters
        );
    });

    if (clearButton) {
        clearButton.onclick = function () {
            if (searchInput) searchInput.value = "";
            if (categorySelect) categorySelect.value = "";
            if (locationSelect) locationSelect.value = "";
            if (dateInput) dateInput.value = "";

            if (sortSelect) {
                sortSelect.value = "date-asc";
            }

            applyFilters();

            if (searchInput) {
                searchInput.focus();
            }
        };
    }

    applyFilters();
}

/* =========================================================
   EVENT DETAILS PAGE
   ========================================================= */

async function initEventDetailsPage() {
    const root = qs("#details-root");

    if (!root) return;

    const notFound = qs("#details-not-found");

    await getAllEvents();

    const id = getParam("id");

    const event = getEvent(id);

    if (!event) {
        root.hidden = true;

        if (notFound) {
            notFound.hidden = false;
        }

        return;
    }

    document.title =
        event.title + " — Marquee";

    function setText(selector, value) {
        const element = qs(selector);

        if (element) {
            element.textContent = value;
        }
    }

    const image = qs("#details-image");

    if (image) {
        image.src = event.image;
        image.alt = event.title;
    }

    setText(
        "#breadcrumb-title",
        event.title
    );

    setText(
        "#details-category",
        event.category
    );

    setText(
        "#details-title",
        event.title
    );

    setText(
        "#details-description",
        event.description
    );

    setText(
        "#details-date",
        formatDate(event.date)
    );

    setText(
        "#details-time",
        formatTime(event.time)
    );

    setText(
        "#details-location",
        event.venue
    );

    setText(
        "#details-city",
        event.city
    );

    setText(
        "#details-organizer-name",
        event.organizer
    );

    setText(
        "#details-organizer-avatar",
        initials(event.organizer)
    );

    const price = qs("#booking-price");

    if (price) {
        price.innerHTML =
            formatPrice(event.price) +
            (
                event.price > 0
                    ? " <small>/ ticket</small>"
                    : ""
            );
    }

    const bookButton = qs("#book-now-btn");
    const alertBox = qs("#booking-alert");
    const seatFill = qs("#seat-meter-fill");
    const seatLabel = qs("#seat-meter-label");

    function updateAvailability() {
        const seats =
            getEffectiveSeats(event);

        const total =
            Number(event.totalSeats) || 1;

        if (seatFill) {
            const percentage =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            (seats / total) * 100
                        )
                    )
                );

            seatFill.style.width =
                percentage + "%";
        }

        if (seatLabel) {
            seatLabel.textContent =
                seats +
                " of " +
                total +
                " seats available";
        }

        return seats;
    }

    async function updateBookingState() {
        const seats =
            updateAvailability();

        const user =
            getCurrentUser();

        if (!bookButton) return;

        bookButton.disabled = false;
        bookButton.textContent = "Book now";

        if (alertBox) {
            alertBox.hidden = true;
        }

        if (user && user.id) {
            const existing =
                await findActiveBooking(
                    user.id,
                    event.id
                );

            if (existing) {
                bookButton.disabled = true;
                bookButton.textContent =
                    "Already booked";

                if (alertBox) {
                    alertBox.hidden = false;
                    alertBox.className =
                        "booking-alert is-success";

                    alertBox.innerHTML =
                        'You are already booked. ' +
                        '<a href="my-bookings.html">' +
                        "View bookings" +
                        "</a>.";
                }

                return;
            }
        }

        if (seats <= 0) {
            bookButton.disabled = true;
            bookButton.textContent = "Sold out";

            if (alertBox) {
                alertBox.hidden = false;
                alertBox.className =
                    "booking-alert is-danger";

                alertBox.textContent =
                    "All seats for this event have been booked.";
            }
        }
    }

    await updateBookingState();

    if (bookButton) {
        bookButton.onclick = async function () {
            const user = getCurrentUser();

            if (!user) {
                const redirect =
                    "event-details.html?id=" +
                    encodeURIComponent(event.id);

                window.location.href =
                    "login.html?redirect=" +
                    encodeURIComponent(redirect);

                return;
            }

            if (!user.id) {
                alert(
                    "User ID not found. Please login again."
                );
                return;
            }

            bookButton.disabled = true;
            bookButton.textContent = "Booking...";

            const existing =
                await findActiveBooking(
                    user.id,
                    event.id
                );

            if (existing) {
                bookButton.disabled = true;
                bookButton.textContent =
                    "Already booked";

                if (alertBox) {
                    alertBox.hidden = false;
                    alertBox.className =
                        "booking-alert is-success";

                    alertBox.textContent =
                        "You are already booked for this event.";
                }

                return;
            }

            if (getEffectiveSeats(event) <= 0) {
                await updateBookingState();
                return;
            }

            const result =
                await createBooking(
                    user.id,
                    event.id
                );

            if (!result.ok) {
                bookButton.disabled = false;
                bookButton.textContent = "Book now";

                if (alertBox) {
                    alertBox.hidden = false;
                    alertBox.className =
                        "booking-alert is-danger";

                    alertBox.textContent =
                        result.error;
                }

                return;
            }

            const bookingId =
                result.booking?.id ||
                result.booking?.booking_id ||
                result.booking?.bookingId;

            if (!bookingId) {
                alert(
                    "Booking was created, but booking ID was not returned."
                );
                return;
            }

            window.location.href =
                "booking-confirmation.html?bookingId=" +
                encodeURIComponent(bookingId);
        };
    }
}

/* =========================================================
   LOGIN PAGE
   ========================================================= */

function initLoginPage() {
    const form = qs("#login-form");

    if (!form) return;

    if (getCurrentUser()) {
        window.location.href =
            getParam("redirect") ||
            "index.html";

        return;
    }

    const email = qs("#login-email");
    const password = qs("#login-password");
    const banner = qs("#login-banner");
    const submit = qs("#login-submit");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (banner) {
            banner.hidden = true;
        }

        if (
            !email.value.trim() ||
            !/^\S+@\S+\.\S+$/.test(
                email.value.trim()
            ) ||
            password.value.length < 6
        ) {
            if (banner) {
                banner.hidden = false;
                banner.className =
                    "form-banner is-error";

                banner.textContent =
                    "Enter a valid email and a password of at least 6 characters.";
            }

            return;
        }

        if (submit) {
            submit.disabled = true;
        }

        const result =
            await loginUser(
                email.value.trim(),
                password.value
            );

        if (submit) {
            submit.disabled = false;
        }

        if (!result.ok) {
            if (banner) {
                banner.hidden = false;
                banner.className =
                    "form-banner is-error";

                banner.textContent =
                    result.error;
            }

            return;
        }

        window.location.href =
            getParam("redirect") ||
            "index.html";
    });
}

/* =========================================================
   REGISTER PAGE
   ========================================================= */

function initRegisterPage() {
    const form = qs("#register-form");

    if (!form) return;

    if (getCurrentUser()) {
        window.location.href = "index.html";
        return;
    }

    const name = qs("#register-name");
    const email = qs("#register-email");
    const password = qs("#register-password");
    const confirm = qs("#register-confirm");
    const banner = qs("#register-banner");
    const submit = qs("#register-submit");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (banner) {
            banner.hidden = true;
        }

        const validName =
            name.value.trim().length >= 2;

        const validEmail =
            /^\S+@\S+\.\S+$/.test(
                email.value.trim()
            );

        const validPassword =
            password.value.length >= 6;

        const samePassword =
            password.value === confirm.value;

        if (
            !validName ||
            !validEmail ||
            !validPassword ||
            !samePassword
        ) {
            if (banner) {
                banner.hidden = false;
                banner.className =
                    "form-banner is-error";

                banner.textContent =
                    "Please enter valid details. Password must be 6+ characters and both passwords must match.";
            }

            return;
        }

        if (submit) {
            submit.disabled = true;
        }

        const result =
            await registerUser(
                name.value.trim(),
                email.value.trim(),
                password.value
            );

        if (submit) {
            submit.disabled = false;
        }

        if (!result.ok) {
            if (banner) {
                banner.hidden = false;
                banner.className =
                    "form-banner is-error";

                banner.textContent =
                    result.error;
            }

            return;
        }

        window.location.href = "index.html";
    });
}

/* =========================================================
   MY BOOKINGS PAGE
   ========================================================= */

async function initMyBookingsPage() {
    const list = qs("#bookings-list");

    if (!list) return;

    const loginPrompt =
        qs("#bookings-login-prompt");

    const empty =
        qs("#bookings-empty");

    const user =
        getCurrentUser();

    if (!user || !user.id) {
        list.hidden = true;

        if (empty) {
            empty.hidden = true;
        }

        if (loginPrompt) {
            loginPrompt.hidden = false;
        }

        return;
    }

    await getAllEvents();

    async function paint() {
        const userBookings =
            await getUserBookings(user.id);

        userBookings.sort(
            (a, b) =>
                new Date(
                    b.created_at ||
                    b.bookedAt ||
                    0
                ) -
                new Date(
                    a.created_at ||
                    a.bookedAt ||
                    0
                )
        );

        if (!userBookings.length) {
            list.innerHTML = "";
            list.hidden = true;

            if (empty) {
                empty.hidden = false;
            }

            return;
        }

        list.hidden = false;

        if (empty) {
            empty.hidden = true;
        }

        list.innerHTML =
            userBookings.map(booking => {

                const event =
                    getEvent(booking.event_id);

                if (!event) return "";

                const bookingId =
                    booking.id ||
                    booking.booking_id ||
                    booking.bookingId;

                return `
                    <div class="booking-row">

                        <a
                            class="booking-row-media"
                            href="event-details.html?id=${encodeURIComponent(event.id)}"
                        >
                            <img
                                src="${escapeHTML(event.image)}"
                                alt="${escapeHTML(event.title)}"
                            >
                        </a>

                        <div>

                            <span class="status-pill confirmed">
                                ✓ Confirmed
                            </span>

                            <h3>
                                <a
                                    href="event-details.html?id=${encodeURIComponent(event.id)}"
                                >
                                    ${escapeHTML(event.title)}
                                </a>
                            </h3>

                            <div class="event-meta">

                                <span>
                                    ${formatDate(event.date)}
                                    ·
                                    ${formatTime(event.time)}
                                </span>

                                <span>
                                    ${escapeHTML(event.city)}
                                </span>

                            </div>

                            <span class="booking-id-tag">
                                ${ICONS.ticket}
                                ${escapeHTML(bookingId)}
                            </span>

                        </div>

                        <div class="booking-row-actions">

                            <a
                                class="btn btn-outline btn-sm"
                                href="booking-confirmation.html?bookingId=${encodeURIComponent(bookingId)}"
                            >
                                View ticket
                            </a>

                            <button
                                class="btn btn-danger-ghost btn-sm"
                                data-cancel="${escapeHTML(bookingId)}"
                            >
                                Cancel booking
                            </button>

                        </div>

                    </div>
                `;
            }).join("");
    }

    await paint();

    list.addEventListener("click", async function (event) {
        const button =
            event.target.closest("[data-cancel]");

        if (!button) return;

        if (
            !window.confirm(
                "Cancel this booking?"
            )
        ) {
            return;
        }

        button.disabled = true;

        const result =
            await cancelBooking(
                button.getAttribute("data-cancel")
            );

        if (!result.ok) {
            alert(result.error);
            button.disabled = false;
            return;
        }

        await getAllEvents();
        await paint();
    });
}

/* =========================================================
   BOOKING CONFIRMATION PAGE
   ========================================================= */

async function initBookingConfirmationPage() {
    const root =
        qs("#confirmation-root");

    const notFound =
        qs("#confirmation-not-found");

    if (!root) return;

    const bookingId =
        getParam("bookingId");

    if (!bookingId) {
        root.hidden = true;

        if (notFound) {
            notFound.hidden = false;
        }

        return;
    }

    const booking =
        await getBookingById(bookingId);

    if (!booking) {
        root.hidden = true;

        if (notFound) {
            notFound.hidden = false;
        }

        return;
    }

    const event =
        getEvent(booking.event_id);

    if (!event) {
        await getAllEvents();
    }

    const finalEvent =
        getEvent(booking.event_id);

    if (!finalEvent) {
        root.hidden = true;

        if (notFound) {
            notFound.hidden = false;
        }

        return;
    }

    const title =
        qs("#confirm-event-title");

    const idElement =
        qs("#confirm-booking-id");

    const dateElement =
        qs("#confirm-date");

    const timeElement =
        qs("#confirm-time");

    const locationElement =
        qs("#confirm-location");

    const priceElement =
        qs("#confirm-price");

    const bookedAtElement =
        qs("#confirm-booked-at");

    if (title) {
        title.textContent =
            finalEvent.title;
    }

    if (idElement) {
        idElement.textContent =
            booking.id ||
            booking.booking_id ||
            booking.bookingId;
    }

    if (dateElement) {
        dateElement.textContent =
            formatDate(finalEvent.date);
    }

    if (timeElement) {
        timeElement.textContent =
            formatTime(finalEvent.time);
    }

    if (locationElement) {
        locationElement.textContent =
            finalEvent.venue +
            ", " +
            finalEvent.city;
    }

    if (priceElement) {
        priceElement.textContent =
            formatPrice(finalEvent.price);
    }

    if (bookedAtElement) {
        bookedAtElement.textContent =
            booking.created_at
                ? new Date(
                    booking.created_at
                ).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short"
                })
                : "Just now";
    }
}

/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        initNav();

        const page =
            document.body.dataset.page;

        if (page === "home") {
            await initHomePage();
        }

        else if (page === "events") {
            await initEventsPage();
        }

        else if (page === "event-details") {
            await initEventDetailsPage();
        }

        else if (page === "login") {
            initLoginPage();
        }

        else if (page === "register") {
            initRegisterPage();
        }

        else if (page === "my-bookings") {
            await initMyBookingsPage();
        }

        else if (page === "booking-confirmation") {
            await initBookingConfirmationPage();
        }
    }
);