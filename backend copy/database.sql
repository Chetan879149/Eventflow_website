PRAGMA foreign_keys = ON;


-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    username TEXT UNIQUE,

    phone TEXT,

    location TEXT,

    -- User role:
    -- 'user'  = normal website user
    -- 'admin' = administrator
    role TEXT NOT NULL DEFAULT 'user'
);


-- ============================================================
-- EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    title TEXT NOT NULL,

    event_date TEXT NOT NULL,

    event_time TEXT NOT NULL,

    location TEXT,

    category TEXT NOT NULL,

    description TEXT,

    ticket_price REAL NOT NULL DEFAULT 0,

    max_attendees INTEGER,

    image_path TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- CONTACTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    first_name TEXT NOT NULL,

    last_name TEXT NOT NULL,

    email TEXT NOT NULL,

    subject TEXT,

    message TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- BOOKINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER,

    event_id INTEGER NOT NULL,

    attendee_name TEXT NOT NULL,

    attendee_email TEXT NOT NULL,

    ticket_quantity INTEGER NOT NULL DEFAULT 1,

    total_price REAL NOT NULL DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'confirmed',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);


-- ============================================================
-- FAVORITES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    event_id INTEGER NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, event_id),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);


-- ============================================================
-- SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    session_token TEXT NOT NULL UNIQUE,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    expires_at TEXT NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- PASSWORD RESET TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    token TEXT NOT NULL UNIQUE,

    expires_at TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);