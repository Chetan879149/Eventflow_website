const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const databasePath = path.join(__dirname, 'eventflow.db');
const database = new Database(databasePath);

// ---- Auth helpers (server-side validation) ----
const getBearerToken = (req) => {
  const header = req.get('authorization') || req.get('Authorization');
  if (!header) return null;
  const parts = String(header).split(' ');
  if (parts.length !== 2) return null;
  if (parts[0] !== 'Bearer') return null;
  const token = parts[1] && String(parts[1]).trim();
  return token || null;
}; 
const requireAuth = (req, res, next) => {
const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const session = database.prepare(`
    SELECT sessions.id, sessions.user_id, sessions.expires_at
    FROM sessions
    WHERE sessions.session_token = ?
  `).get(token);

  if (!session) return res.status(401).json({ error: 'Session expired' });

  if (new Date(session.expires_at) < new Date()) {
    database.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    return res.status(401).json({ error: 'Session expired' });
  }

  const user = database.prepare(`
    SELECT id, email, first_name AS firstName, last_name AS lastName, role
    FROM users
    WHERE id = ?
  `).get(session.user_id);

  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  req.auth = { token, user };
  return next();
};


// If sqlite db still exists in project root (move may have failed while server/db was open), fall back.
try {
  const fs = require('fs');
  const rootDbPath = path.join(__dirname, '..', 'eventflow.db');
  if (!fs.existsSync(databasePath) && fs.existsSync(rootDbPath)) {
    // Re-create connection with fallback DB file
    const fallbackDb = new Database(rootDbPath);
    // eslint-disable-next-line no-global-assign
    global.database = fallbackDb;
  }
} catch (e) {
  // ignore
}

// ---- Login gating (server-side redirects) ----
// Public demo is the first screen. After login, users enter index.html.

// Helper: validate bearer token against server sessions
const isTokenValid = (req) => {
    const token = getBearerToken(req);

    if (!token) {
        return false;
    }

    const session = database.prepare(`
        SELECT
            sessions.id,
            sessions.user_id,
            sessions.expires_at,
            users.role,
            users.email,
            users.first_name,
            users.last_name
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.session_token = ?
    `).get(token);

    if (!session) {
        return false;
    }

    // Check whether the session has expired
    if (new Date(session.expires_at) < new Date()) {
        database
            .prepare('DELETE FROM sessions WHERE id = ?')
            .run(session.id);

        return false;
    }

    // Store authenticated user information
    // so other routes can check the user's role.
    req.auth = {
        user: {
            id: session.user_id,
            email: session.email,
            firstName: session.first_name,
            lastName: session.last_name,
            role: session.role
        }
    };

    return true;
};
// Middleware: allow only authenticated administrators
const requireAdmin = (req, res, next) => {
    if (!isTokenValid(req)) {
        return res.status(401).json({
            error: 'Authentication required.'
        });
    }

    if (
        !req.auth ||
        !req.auth.user ||
        req.auth.user.role !== 'admin'
    ) {
        return res.status(403).json({
            error: 'Administrator access required.'
        });
    }

    next();
};

// Root + index
// IMPORTANT: Only protect the HTML page itself. Static assets should remain unaffected.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "demo.html"));
});

app.get("/demo.html", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "demo.html"));
});

app.get("/index.html", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

// Admin: keep protected (unauthenticated -> login)
app.get('/admin.html', (req, res) => {
    return res.sendFile(
        path.join(__dirname, '..', 'frontend', 'admin.html')
    );
});



const schemaSql = `


PRAGMA foreign_keys = ON;

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
    branding_image TEXT,
    role TEXT NOT NULL DEFAULT 'user'
);    
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

database.exec(schemaSql);

// Ensure role column exists for existing databases.
try {
    const userCols = database.prepare("PRAGMA table_info(users)").all();

    const hasRole = userCols.some(c => c.name === 'role');

    if (!hasRole) {
        database.prepare(
            "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"
        ).run();
    }

    // Existing users remain normal users unless explicitly promoted.
    database.prepare(
        "UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''"
    ).run();

} catch (e) {
    console.error('Role migration error:', e.message);
}

// Ensure users table has branding_image column (SQLite ALTER only if missing)
try {
  const cols = database.prepare("PRAGMA table_info(users)").all();
  const hasBranding = cols.some(c => c.name === 'branding_image');
  if (!hasBranding) {
    database.prepare('ALTER TABLE users ADD COLUMN branding_image TEXT').run();
  }
} catch (e) {
  // ignore if ALTER fails for any reason
}

// Ensure optional account profile columns exist for older EventFlow databases.
try {
  const userCols = database.prepare("PRAGMA table_info(users)").all();
  const hasUsername = userCols.some(c => c.name === 'username');
  const hasPhone = userCols.some(c => c.name === 'phone');
  const hasLocation = userCols.some(c => c.name === 'location');
  if (!hasUsername) database.prepare('ALTER TABLE users ADD COLUMN username TEXT').run();
  if (!hasPhone) database.prepare('ALTER TABLE users ADD COLUMN phone TEXT').run();
  if (!hasLocation) database.prepare('ALTER TABLE users ADD COLUMN location TEXT').run();
  database.prepare("UPDATE users SET username = lower(substr(email, 1, instr(email, '@') - 1)) WHERE (username IS NULL OR username = '') AND instr(email, '@') > 1").run();
} catch (e) {
  // ignore migration errors; email/password auth remains available
}

// Subscriptions table to persist user plan selections
database.exec(`
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan TEXT NOT NULL,
  price TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

const createPasswordResetTransport = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost) {
    return null;
  }

  const transportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
  };

  return nodemailer.createTransport(transportOptions);
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const transporter = createPasswordResetTransport();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@eventflow.local';

  if (!transporter) {
    console.log(`Password reset link for ${email}: ${resetLink}`);
    return;
  }

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: 'EventFlow password reset',
    text: `Use this link to reset your password: ${resetLink}`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`
  });
};

const ensureDemoUser = () => {
  const existing = database.prepare('SELECT id, password_hash FROM users WHERE email = ?').get('demo@eventflow.com');

  if (!existing) {
    const passwordHash = bcrypt.hashSync('demo1234', 12);
    database.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'user')
    `).run('Demo', 'User', 'demo@eventflow.com', passwordHash);
    return;
  }

  const currentHash = existing.password_hash || '';
  const isSha256Hash = /^[a-f0-9]{64}$/i.test(currentHash);
  if (isSha256Hash) {
    const passwordHash = bcrypt.hashSync('demo1234', 12);
    database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, existing.id);
  }
};

ensureDemoUser();

const seedDefaultEvents = () => {
  const demoUser = database.prepare('SELECT id FROM users WHERE email = ?').get('demo@eventflow.com');
  if (!demoUser) return;
  const userId = demoUser.id;

  const defaultEvents = [
    {
      title: 'Global Tech Summit 2024',
      date: 'December 20, 2024',
      time: '9:00 AM',
      location: 'San Francisco, CA',
      category: 'conference',
      description: 'Join industry leaders and innovators for the biggest tech event of the year.',
      ticketPrice: 299,
      maxAttendees: 2500,
      imagePath: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop'
    },
    {
      title: 'Neon Nights Music Festival',
      date: 'January 5-7, 2025',
      time: '6:00 PM',
      location: 'Las Vegas, NV',
      category: 'music',
      description: 'Three days of non-stop music featuring world-renowned artists and DJs.',
      ticketPrice: 149,
      maxAttendees: 50000,
      imagePath: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=250&fit=crop'
    },
    {
      title: 'UI/UX Design Masterclass',
      date: 'December 28, 2024',
      time: '10:00 AM',
      location: 'Online Event',
      category: 'workshop',
      description: 'Learn cutting-edge design techniques from industry experts.',
      ticketPrice: 79,
      maxAttendees: 500,
      imagePath: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=250&fit=crop'
    },
    {
      title: 'City Marathon 2025',
      date: 'February 15, 2025',
      time: '6:00 AM',
      location: 'New York, NY',
      category: 'sports',
      description: 'Run through scenic routes and challenge yourself in the annual city marathon.',
      ticketPrice: 50,
      maxAttendees: 20000,
      imagePath: 'https://images.unsplash.com/photo-1461896836934-a2a0d8c0b1f2?w=400&h=250&fit=crop'
    },
    {
      title: 'Future of Business Summit',
      date: 'January 20, 2025',
      time: '9:00 AM',
      location: 'London, UK',
      category: 'conference',
      description: 'Explore emerging trends and network with business leaders worldwide.',
      ticketPrice: 399,
      maxAttendees: 3000,
      imagePath: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=250&fit=crop'
    },
    {
      title: "New Year's Eve Concert",
      date: 'December 31, 2024',
      time: '10:00 PM',
      location: 'Miami, FL',
      category: 'music',
      description: 'Ring in the new year with an unforgettable live music experience.',
      ticketPrice: 199,
      maxAttendees: 15000,
      imagePath: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=250&fit=crop'
    }
  ];

  const insert = database.prepare(`
    INSERT INTO events (user_id, title, event_date, event_time, location, category, description, ticket_price, max_attendees, image_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  defaultEvents.forEach(ev => {
    const exists = database.prepare('SELECT id FROM events WHERE title = ?').get(ev.title);
    if (!exists) {
      insert.run(
        userId,
        ev.title,
        ev.date,
        ev.time,
        ev.location,
        ev.category,
        ev.description,
        ev.ticketPrice,
        ev.maxAttendees,
        ev.imagePath
      );
    }
  });
};

seedDefaultEvents();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Session validation endpoint for frontend guards
app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ ok: true, user: req.auth.user });
});

// Logout endpoint: delete current session token
app.post('/api/auth/logout', (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(200).json({ ok: true });
  }

  database.prepare('DELETE FROM sessions WHERE session_token = ?').run(token);
  return res.json({ ok: true });
});


app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, password, username, phone, location } = req.body;
  if (!firstName || !lastName || !email || !password) return res.status(400).json({ error: 'Please fill in all required fields.' });

  const emailNormalized = String(email).trim().toLowerCase();
  const usernameValue = username ? String(username).trim().toLowerCase() : null;
  if (usernameValue && !/^[a-z0-9._-]{3,30}$/.test(usernameValue)) {
    return res.status(400).json({ error: 'Username must be 3-30 characters and use only letters, numbers, dot, underscore, or hyphen.' });
  }
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long.' });

  const existingUser = database.prepare('SELECT id FROM users WHERE email = ?').get(emailNormalized);
  if (existingUser) return res.status(409).json({ error: 'An account with that email already exists.' });
  if (usernameValue) {
    const existingUsername = database.prepare('SELECT id FROM users WHERE lower(username) = ?').get(usernameValue);
    if (existingUsername) return res.status(409).json({ error: 'That username is already in use.' });
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const result = database.prepare(`
    INSERT INTO users (first_name, last_name, email, password_hash, username, phone, location, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'user')
  `).run(String(firstName).trim(), String(lastName).trim(), emailNormalized, passwordHash, usernameValue, phone ? String(phone).trim() : null, location ? String(location).trim() : null);

  res.status(201).json({
    message: 'Account created successfully.',
    user: { id: result.lastInsertRowid, firstName: String(firstName).trim(), lastName: String(lastName).trim(), email: emailNormalized, username: usernameValue, phone: phone ? String(phone).trim() : '', location: location ? String(location).trim() : '' }
  });
});

app.post('/api/admin/create-admin', requireAdmin, async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'First name, last name, email, and password are required.' });
  }

  const emailNormalized = String(email).trim().toLowerCase();
  const passwordValue = String(password).trim();

  if (passwordValue.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const existingUser = database.prepare('SELECT id FROM users WHERE lower(email) = ?').get(emailNormalized);
  if (existingUser) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const usernameValue = emailNormalized.split('@')[0] || 'admin';
  const passwordHash = await bcrypt.hash(passwordValue, 12);

  const result = database.prepare(`
    INSERT INTO users (first_name, last_name, email, password_hash, username, role)
    VALUES (?, ?, ?, ?, ?, 'admin')
  `).run(String(firstName).trim(), String(lastName).trim(), emailNormalized, passwordHash, usernameValue);

  res.status(201).json({
    message: 'Admin account created successfully.',
    user: {
      id: result.lastInsertRowid,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: emailNormalized,
      username: usernameValue,
      role: 'admin'
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email and password and role are required.' });
  }
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role selected.'
    });
  }


  const identifier = String(email).trim().toLowerCase();
  const user = database.prepare(`
    SELECT * FROM users
    WHERE (lower(email) = ? OR lower(COALESCE(username, '')) = ?) AND role = ?
    LIMIT 1
  `).get(identifier, identifier, role);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const validPassword = await bcrypt.compare(String(password), user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const sessionToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  database.prepare(`
    INSERT INTO sessions (user_id, session_token, expires_at)
    VALUES (?, ?, ?)
  `).run(user.id, sessionToken, expiresAt);

  res.json({
    message: 'Login successful.',
    token: sessionToken,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      username: user.username || '',
      phone: user.phone || '',
      location: user.location || '',
      role: user.role
    }
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const emailValue = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!emailValue) return res.status(400).json({ error: 'Email is required.' });

  const user = database.prepare('SELECT id FROM users WHERE lower(email) = ?').get(emailValue);
  let resetLink = null;

  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    database.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);
    resetLink = `${req.protocol}://${req.get('host')}/resetPasswordModal.html?token=${token}`;

    const transporter = createPasswordResetTransport();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@eventflow.local',
        to: emailValue,
        subject: 'EventFlow password reset',
        text: `Use this link to reset your password: ${resetLink}`,
        html: `<p>Use this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`
      });
    } else {
      console.log(`Password reset link for ${emailValue}: ${resetLink}`);
    }

    const response = { message: 'Password reset instructions have been generated.' };
    if (!transporter) response.resetLink = resetLink;
    return res.json(response);
  }

  return res.json({ message: 'If the email exists, password reset instructions have been generated.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;



  const tokenValue = typeof token === 'string' ? token.trim() : '';
  const passwordValue = typeof newPassword === 'string' ? newPassword.trim() : '';

  if (!tokenValue || !passwordValue) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  // Basic password policy (adjust if you want to be stricter)
  if (passwordValue.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const resetRecord = database.prepare(`
    SELECT id, user_id, expires_at FROM password_resets WHERE token = ?
  `).get(tokenValue);

  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid or expired reset token.' });
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    // expire + consume
    database.prepare('DELETE FROM password_resets WHERE id = ?').run(resetRecord.id);
    return res.status(400).json({ error: 'Invalid or expired reset token.' });
  }

  const passwordHash = await bcrypt.hash(passwordValue, 12);

  // Ensure single-use semantics: delete the token after the password update succeeds
  const tx = database.transaction(() => {
    database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, resetRecord.user_id);
    database.prepare('DELETE FROM password_resets WHERE id = ?').run(resetRecord.id);
  });

  tx();

  res.json({ message: 'Password updated successfully.' });
});

app.post('/api/contact', (req, res) => {
  const { firstName, lastName, email, subject, message } = req.body;

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ error: 'Please fill in the contact form.' });
  }

  const result = database.prepare(`
    INSERT INTO contacts (first_name, last_name, email, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(String(firstName).trim(), String(lastName).trim(), String(email).trim(), String(subject || '').trim(), String(message).trim());

  res.status(201).json({ message: 'Contact message saved.', id: result.lastInsertRowid });
});

app.post('/api/events', (req, res) => {
  const {
    userId = 1,
    title,
    date,
    time,
    location,
    category,
    description,
    ticketPrice = 0,
    maxAttendees = null,
    imagePath = null
  } = req.body;

  if (!title || !date || !time || !category) {
    return res.status(400).json({ error: 'Title, date, time, and category are required.' });
  }

  const result = database.prepare(`
    INSERT INTO events (
      user_id, title, event_date, event_time, location, category, description, ticket_price, max_attendees, image_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(userId),
    String(title).trim(),
    String(date),
    String(time),
    String(location || '').trim(),
    String(category).trim(),
    String(description || '').trim(),
    Number(ticketPrice) || 0,
    maxAttendees === '' || maxAttendees === null ? null : Number(maxAttendees),
    imagePath ? String(imagePath) : null
  );

  res.status(201).json({ message: 'Event saved.', id: result.lastInsertRowid });
});

app.post('/api/bookings', (req, res) => {
  const { userId = null, eventId, attendeeName, attendeeEmail, ticketQuantity = 1, totalPrice = 0 } = req.body;

  if (!eventId || !attendeeName || !attendeeEmail) {
    return res.status(400).json({ error: 'Booking details are incomplete.' });
  }

  const result = database.prepare(`
    INSERT INTO bookings (user_id, event_id, attendee_name, attendee_email, ticket_quantity, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId ? Number(userId) : null,
    Number(eventId),
    String(attendeeName).trim(),
    String(attendeeEmail).trim(),
    Number(ticketQuantity) || 1,
    Number(totalPrice) || 0
  );

  res.status(201).json({ message: 'Booking saved.', id: result.lastInsertRowid });
});

app.post('/api/favorites', (req, res) => {
  const { userId, eventId } = req.body;

  if (!userId || !eventId) {
    return res.status(400).json({ error: 'User and event are required.' });
  }

  database.prepare(`
    INSERT OR IGNORE INTO favorites (user_id, event_id)
    VALUES (?, ?)
  `).run(Number(userId), Number(eventId));

  res.status(201).json({ message: 'Favorite saved.' });
});

app.get('/api/events', (req, res) => {
  const events = database.prepare(`
    SELECT events.*, users.first_name, users.last_name
    FROM events
    JOIN users ON users.id = events.user_id
    ORDER BY events.created_at DESC
  `).all();

  res.json(events);
});

// Persist a subscription (trial or paid) for a user
app.post('/api/subscription', (req, res) => {
  const { userId, plan, price } = req.body;

  if (!userId || !plan) {
    return res.status(400).json({ error: 'userId and plan are required.' });
  }

  const result = database.prepare(`
    INSERT INTO subscriptions (user_id, plan, price)
    VALUES (?, ?, ?)
  `).run(Number(userId), String(plan), String(price || ''));

  res.status(201).json({ message: 'Subscription saved.', id: result.lastInsertRowid });
});

app.get('/api/subscription/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Invalid userId' });

  const sub = database.prepare(`
    SELECT * FROM subscriptions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1
  `).get(userId);

  res.json(sub || {});
});

// Branding endpoints: store/retrieve a base64 image for user
app.post('/api/branding', (req, res) => {
  const { userId, image } = req.body;
  if (!userId || !image) return res.status(400).json({ error: 'userId and image are required.' });

  const result = database.prepare('UPDATE users SET branding_image = ? WHERE id = ?').run(String(image), Number(userId));
  if (result.changes === 0) return res.status(404).json({ error: 'User not found.' });

  res.json({ message: 'Branding saved.' });
});

app.get('/api/branding/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Invalid userId' });

  const row = database.prepare('SELECT branding_image FROM users WHERE id = ?').get(userId);
  res.json({ image: row?.branding_image || null });
});

const adminTableQueries = {
  users: `
    SELECT
        id,
        first_name AS firstName,
        last_name AS lastName,
        email,
        username,
        phone,
        location,
        role,
        created_at AS createdAt
    FROM users
    ORDER BY created_at DESC
  `,
  events: `
    SELECT events.id, events.title, events.event_date AS eventDate, events.event_time AS eventTime,
           events.location, events.category, events.description, events.ticket_price AS ticketPrice,
           events.max_attendees AS maxAttendees, events.image_path AS imagePath,
           events.created_at AS createdAt,
           users.first_name AS organizerFirstName,
           users.last_name AS organizerLastName,
           users.email AS organizerEmail
    FROM events
    JOIN users ON users.id = events.user_id
    ORDER BY events.created_at DESC
  `,
  contacts: `
    SELECT id, first_name AS firstName, last_name AS lastName, email, subject, message, created_at AS createdAt
    FROM contacts
    ORDER BY created_at DESC
  `,
  bookings: `
    SELECT bookings.id, bookings.event_id AS eventId, bookings.user_id AS userId,
           bookings.attendee_name AS attendeeName, bookings.attendee_email AS attendeeEmail,
           bookings.ticket_quantity AS ticketQuantity, bookings.total_price AS totalPrice,
           bookings.status, bookings.created_at AS createdAt,
           events.title AS eventTitle
    FROM bookings
    JOIN events ON events.id = bookings.event_id
    ORDER BY bookings.created_at DESC
  `,
  favorites: `
    SELECT favorites.id, favorites.user_id AS userId, favorites.event_id AS eventId,
           favorites.created_at AS createdAt,
           users.email AS userEmail,
           events.title AS eventTitle
    FROM favorites
    JOIN users ON users.id = favorites.user_id
    JOIN events ON events.id = favorites.event_id
    ORDER BY favorites.created_at DESC
  `,
  sessions: `
    SELECT sessions.id, sessions.user_id AS userId, sessions.session_token AS sessionToken,
           sessions.created_at AS createdAt, sessions.expires_at AS expiresAt,
           users.email AS userEmail
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    ORDER BY sessions.created_at DESC
  `
};

const adminEditColumns = {
  users: {
    table: 'users',
    columns: {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      username: 'username',
      phone: 'phone',
      location: 'location',
      role: 'role',
      // NOTE: admin can submit plaintext `password` but backend will hash before storing.
      password: 'password_hash'
    }
  },
  events: {
    table: 'events',
    columns: {
      title: 'title',
      eventDate: 'event_date',
      eventTime: 'event_time',
      location: 'location',
      category: 'category',
      description: 'description',
      ticketPrice: 'ticket_price',
      maxAttendees: 'max_attendees',
      imagePath: 'image_path'
    }
  },
  contacts: {
    table: 'contacts',
    columns: {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      subject: 'subject',
      message: 'message'
    }
  },
  bookings: {
    table: 'bookings',
    columns: {
      attendeeName: 'attendee_name',
      attendeeEmail: 'attendee_email',
      ticketQuantity: 'ticket_quantity',
      totalPrice: 'total_price',
      status: 'status'
    }
  }
};

const adminDeleteTables = new Set(['users', 'events', 'contacts', 'bookings', 'favorites', 'sessions']);

app.delete('/api/admin/records/:table/:id', requireAdmin, async (req, res) => {
  const tableName = String(req.params.table || '').toLowerCase();
  const recordId = Number(req.params.id);
  const config = adminEditColumns[tableName];

  if (!config || !recordId) {
    return res.status(400).json({ error: 'Invalid record request.' });
  }

  // Special case: admin can submit plaintext `password` for users table.
  // Only update password_hash if a non-empty plaintext password is provided.
  const updates = [];
  const values = [];

  if (tableName === 'users' && Object.prototype.hasOwnProperty.call(req.body, 'password')) {
    const rawPassword = typeof req.body.password === 'string' ? req.body.password : '';
    const passwordValue = rawPassword.trim();

    if (passwordValue.length > 0) {
      if (passwordValue.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      const passwordHash = await bcrypt.hash(passwordValue, 12);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }
    // If empty, do nothing (prevents breaking login when password is left blank).
  }

  // Apply remaining editable columns (excluding `password`, which we handled above)
  Object.entries(config.columns).forEach(([requestKey, columnName]) => {
    if (requestKey === 'password') {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, requestKey)) {
      updates.push(`${columnName} = ?`);
      values.push(req.body[requestKey] === '' ? null : req.body[requestKey]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No editable fields were provided.' });
  }

  const statement = database.prepare(`
    UPDATE ${config.table}
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  const result = statement.run(...values, recordId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  res.json({ message: 'Record updated.' });
});
app.delete('/api/admin/records/:table/:id', requireAdmin, (req, res) => {
  const tableName = String(req.params.table || '').toLowerCase();
  const recordId = Number(req.params.id);

  if (!adminDeleteTables.has(tableName) || !recordId) {
    return res.status(400).json({ error: 'Invalid record request.' });
  }

  const tableMap = {
    users: 'users',
    events: 'events',
    contacts: 'contacts',
    bookings: 'bookings',
    favorites: 'favorites',
    sessions: 'sessions'
  };

  const result = database.prepare(`DELETE FROM ${tableMap[tableName]} WHERE id = ?`).run(recordId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Record not found.' });
  }

  res.json({ message: 'Record deleted.' });
});
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = {
      users: database.prepare('SELECT COUNT(*) AS count FROM users').get().count,
      events: database.prepare('SELECT COUNT(*) AS count FROM events').get().count,
      contacts: database.prepare('SELECT COUNT(*) AS count FROM contacts').get().count,
      bookings: database.prepare('SELECT COUNT(*) AS count FROM bookings').get().count,
      favorites: database.prepare('SELECT COUNT(*) AS count FROM favorites').get().count,
      sessions: database.prepare('SELECT COUNT(*) AS count FROM sessions').get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      error: 'Unable to load admin statistics.'
    });
  }
});

app.get('/api/admin/records', requireAdmin, (req, res) => {
  const table = String(req.query.table || '').toLowerCase();
  const query = adminTableQueries[table];

  if (!query) {
    return res.status(400).json({ error: 'Unknown table requested.' });
  }

  const rows = database.prepare(query).all();
  res.json({ table, rows });
});

app.get('/api/users/current', requireAuth, (req, res) => {
    const user = database.prepare(`
        SELECT
            id,
            first_name AS firstName,
            last_name AS lastName,
            email,
            username,
            phone,
            location,
            role,
            branding_image AS brandingImage
        FROM users
        WHERE id = ?
    `).get(req.auth.user.id);

    if (!user) {
        return res.status(404).json({
            error: 'User not found.'
        });
    }

    res.json(user);
});

// default route removed: root is handled by the login redirect routes above.


app.listen(port, () => {
  console.log(`EventFlow server running at http://localhost:${port}`);
});

