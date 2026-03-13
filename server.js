const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();

const SQLiteStore = require('connect-sqlite3')(session);

// Trust proxy if behind a reverse proxy (Render, Heroku, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const db = new sqlite3.Database('/data/users.db');
console.log("✅ Connected to DB at:", path.resolve('./data/users.db'));

// Wrap db.get() and db.run() inside Promise-based functions
function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
      });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
          if (err) reject(err);
          else resolve(this);
      });
  });
}

// Create the users table with additional fields
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    real_name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    profile_picture TEXT DEFAULT NULL,
    two_factor_enabled INTEGER DEFAULT 0,
    last_login TEXT DEFAULT NULL,
    reset_token TEXT DEFAULT NULL,
    reset_token_expires INTEGER DEFAULT NULL
  )`);
});
console.log("✅ Database created successfully.");
console.log("✅ Users table created successfully.");

app.use(express.json());  // ✅ Required for JSON requests
app.use(bodyParser.urlencoded({ extended: true })); // ✅ Parses form data (x-www-form-urlencoded)


// Session settings
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',   // The SQLite DB file to use
    dir: '/data',         // Optional directory for session DB
    table: 'sessions'    // Optional table name
  }),
  secret: process.env.SESSION_SECRET || 'dev_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 // 1 day session lifetime
  }
}));

// Serve only public static files
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware to protect private pages
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    res.redirect('/login.html');
  }
}

// Role-based authorization middleware
function authorize(requiredRole) {
  return (req, res, next) => {
      if (!req.session.user || !req.session.user.role) {
          return res.status(403).json({ error: 'Access denied.' });
      }

      const roleHierarchy = { user: 1, admin: 2, owner: 3 };

      if ((roleHierarchy[req.session.user.role] || 0) < roleHierarchy[requiredRole]) {
          return res.status(403).json({ error: 'Insufficient permissions.' });
      }

      next();
  };
}

// Serve static files from 'public' (accessible without authentication)
app.use(express.static(path.join(__dirname, 'public')));

// Serve private assets only for authenticated users
app.use('/private', ensureAuthenticated, express.static(path.join(__dirname, 'private')));

app.get('/profile', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'private/profile.html'));
});

// Protected: Main tool page (Index) and Camera Sizer Script
app.get('/calc-tool.html', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'private/calc-tool.html')));

app.get('/camera-server-sizer.js', ensureAuthenticated, (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'private/camera-server-sizer.min.js'));
});

app.get('/admin.html', ensureAuthenticated, (req, res) => {
  if (req.session.user.role.toLowerCase() !== 'owner') {
      return res.status(403).send('Access denied');
  }
  res.sendFile(path.join(__dirname, 'private/admin.html'));
});

// Fetch authenticated user data
app.get('/get-user', async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.session.user.id;
    const row = await dbGet(
      `SELECT username, email, real_name, role, status, profile_picture, two_factor_enabled, last_login 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!row) return res.status(404).json({ error: 'User not found' });

    res.json(row);
  } catch (err) {
    console.error("Error fetching user:", err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Registration
app.post('/register', async (req, res) => {
  try {
    const { real_name, username, email, password } = req.body;

    // Ensure all fields exist before trimming
    if (!username || !email || !password || !real_name) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Trim inputs
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedRealName = real_name.trim();

    // Validate password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()\-_=+])[A-Za-z\d@$!%*?&^#()\-_=+]{8,}$/;
    if (!strongPasswordRegex.test(trimmedPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters, include an uppercase letter, a number, and a special character.' });
    }

    // Check for existing user
    const existingUser = await dbGet(
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
      [trimmedUsername, trimmedEmail]
    );
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    // Hash the password
    const hash = await bcrypt.hash(trimmedPassword, 12);

    // Insert user into database
    await dbRun(
      `INSERT INTO users (username, email, real_name, password, role, status, created_at) 
       VALUES (?, ?, ?, ?, 'user', 'active', CURRENT_TIMESTAMP)`,
      [trimmedUsername, trimmedEmail, trimmedRealName, hash]
    );

    res.status(201).json({ message: 'Registration successful.', redirect: 'login.html' });
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
      let { username, password } = req.body;

      // ✅ Ensure all required fields are present
      if (!username || !password) {
          return res.status(400).json({ error: "Username and password are required." });
      }

      username = username.trim();
      password = password.trim();

      // ✅ Retrieve user by either username or email (case-insensitive)
      const row = await dbGet(
          `SELECT id, username, password, role, status FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)`,
          [username, username.toLowerCase()]
      );

      // ✅ Prevent user enumeration by using the same response for missing accounts
      if (!row || !(await bcrypt.compare(password, row.password))) {
          return res.status(401).json({ error: "Invalid credentials." });
      }

      // ✅ Prevent revealing if an account is banned/suspended
      if (row.status !== 'active') {
          return res.status(401).json({ error: "Invalid credentials." });
      }

      // ✅ Securely regenerate session before setting user details
      req.session.regenerate(async (err) => {
          if (err) {
              console.error("Session regeneration error:", err.message);
              return res.status(500).json({ error: "Session error. Try again later." });
          }

          // ✅ Store only necessary user details in session
          req.session.user = { id: row.id, username: row.username, role: row.role };

          try {
              // ✅ Update last login timestamp AFTER session is regenerated
              await dbRun(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [row.id]);
          } catch (dbErr) {
              console.error("Database error updating last login:", dbErr.message);
          }

          if (req.headers["content-type"] === "application/json") {
            res.json({ message: "Login successful.", redirect: "/calc-tool.html" });
          } else {
            res.redirect("/calc-tool.html");
          }
      });

  } catch (err) {
      console.error("Login Error:", err.message);
      res.status(500).json({ error: "Internal Server Error. Please try again later." });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

// Update profile
app.post('/update-profile', ensureAuthenticated, async (req, res) => {
  try {
    const { email, real_name } = req.body;

    if (!email || !real_name) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const userId = req.session.user.id;

    await dbRun(
      `UPDATE users SET email = ?, real_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [email, real_name, userId]
    );

    res.json({ message: "Profile updated successfully." });
  } catch (err) {
    console.error("Error updating profile:", err.message);
    res.status(500).json({ error: "Database error." });
  }
});

// Update account status
app.post('/update-status', authorize('admin'), (req, res) => {
  const { username, status } = req.body;
  if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(`UPDATE users SET status = ? WHERE username = ?`, [status, username], (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: `User ${username} is now ${status}.` });
  });
});

// Generate a password reset
app.post('/request-password-reset', async (req, res) => {
  try {
      const email = req.body.email.trim().toLowerCase(); // Normalize email once before query

      // Check if the email exists in the database
      const user = await dbGet(`SELECT id FROM users WHERE email = ?`, [email]);

      if (!user) {
          // Always respond with the same message to prevent email enumeration attacks
          return res.status(200).json({ message: 'If this email is registered, you will receive reset instructions.' });
      }

      // Generate a secure reset token
      const resetToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // Token expires in 1 hour

      // Store the reset token securely in the database
      await dbRun(`UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`, 
                  [resetToken, expiresAt, user.id]);

      // TODO: Send the reset token via email (Not implemented here)
      console.log(`Password reset token for ${email}: ${resetToken}`);

      // Always respond with a generic success message (Prevents email leaks)
      res.json({ message: 'If this email is registered, you will receive reset instructions.' });
  } catch (err) {
      console.error("Password Reset Request Error:", err.message);
      res.status(500).json({ error: 'Database error' });
  }
});

// Reset password - forgot
app.post('/reset-password', async (req, res) => {
  try {
      const { resetToken, newPassword } = req.body;

      // ✅ Normalize input (trim whitespace)
      const normalizedToken = resetToken.trim();
      const trimmedPassword = newPassword.trim();

      // ✅ Verify the token and check expiration
      const row = await dbGet(`SELECT id, reset_token_expires FROM users WHERE reset_token = ?`, [normalizedToken]);

      if (!row) {
          return res.status(400).json({ error: "Invalid or expired reset token." });
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (row.reset_token_expires < currentTime) {
          return res.status(400).json({ error: "Reset token has expired." });
      }

      // ✅ Enforce strong password policy
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(trimmedPassword)) {
          return res.status(400).json({ error: "Password must be at least 8 characters, include an uppercase letter, a number, and a special character." });
      }

      // ✅ Clear reset token BEFORE updating password to prevent reuse attacks
      await dbRun(`UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?`, [row.id]);

      // ✅ Hash the new password safely
      const saltRounds = 12;
      const hash = await bcrypt.hash(trimmedPassword, saltRounds);

      // ✅ Update password in the database
      await dbRun(`UPDATE users SET password = ? WHERE id = ?`, [hash, row.id]);

      res.status(200).json({ message: "Password reset successful." });

  } catch (err) {
      console.error("Password Reset Error:", err.message);
      res.status(500).json({ error: "Database error." });
  }
});

// Update password - logged in
app.post('/update-password', ensureAuthenticated, async (req, res) => {
  try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.session.user.id;

      // ✅ Trim input to prevent accidental whitespace issues
      const trimmedOldPassword = oldPassword.trim();
      const trimmedNewPassword = newPassword.trim();

      // ✅ Fetch the current password hash
      const row = await dbGet('SELECT password FROM users WHERE id = ?', [userId]);

      if (!row || !(await bcrypt.compare(trimmedOldPassword, row.password))) {
          return res.status(400).json({ error: 'Old password is incorrect.' });
      }

      // ✅ Enforce strong password policy
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(trimmedNewPassword)) {
          return res.status(400).json({ error: 'Password must be at least 8 characters, include an uppercase letter, a number, and a special character.' });
      }

      // ✅ Hash the new password safely
      let hash;
      try {
          const saltRounds = 12;
          hash = await bcrypt.hash(trimmedNewPassword, saltRounds);
      } catch (hashError) {
          console.error("Hashing Error:", hashError.message);
          return res.status(500).json({ error: 'Password processing error' });
      }

      // ✅ Update the password in the database
      await dbRun('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);

      // ✅ Regenerate session before sending success response
      req.session.regenerate((err) => {
          if (err) {
              console.error('Session regeneration error:', err.message);
              return res.status(500).json({ error: 'Session error. Please log in again.' });
          }
          res.json({ message: 'Password updated successfully. Please log in again.' });
      });
  } catch (err) {
      console.error('Error updating password:', err.message);
      res.status(500).json({ error: 'Database error' });
  }
});

// =======================
// 🔹 DATABASE SETUP 🔹
// =======================

// Enable foreign key constraints
db.run(`PRAGMA foreign_keys = ON;`);


// Create results table (linked to user_id)
db.run(
  `CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    result TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("Database Error: Failed to create results table.", err.message);
    } else {
      console.log("✅ Results table is ready.");
    }
  }
);

// Create configurations table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    siteName TEXT NOT NULL,
    cameraCount INTEGER NOT NULL,
    retentionDays INTEGER NOT NULL,
    configJson TEXT NOT NULL,  -- Store entire form config as JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  (err) => {
    if (err) {
      console.error("Database Error: Failed to create configurations table.", err.message);
    } else {
      console.log("✅ Configurations table is ready.");
    }
  }
);

// =======================
// 🔹 CONFIGURATIONS API 🔹
// =======================

// Save configuration
app.post('/save-configuration', ensureAuthenticated, (req, res) => {
  const { siteName, cameraCount, retentionDays } = req.body;
  
  // Validate input
  if (!siteName || !cameraCount || !retentionDays) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const configJson = JSON.stringify(req.body); // Save full config
  console.log("✅ Saving config for user:", req.session.user?.id);
  // console.log("Received config:", req.body);

  db.run(
    `INSERT INTO configurations (user_id, siteName, cameraCount, retentionDays, configJson) 
     VALUES (?, ?, ?, ?, ?)`,
    [req.session.user.id, siteName, cameraCount, retentionDays, configJson],
    function (err) {
      if (err) {
        console.error("Database Error: Failed to save configuration.", err.message);
        return res.status(500).json({ error: "Error saving configuration." });
      }
      res.json({ success: true, message: "✅ Configuration saved.", id: this.lastID });
    }
  );
});

// Get saved configurations
app.get('/get-configurations', ensureAuthenticated, (req, res) => {
  db.all(
    `SELECT id, siteName, cameraCount, retentionDays, timestamp 
     FROM configurations WHERE user_id = ? ORDER BY timestamp DESC`,
    [req.session.user.id],
    (err, rows) => {
      if (err) {
        console.error("Database Error: Failed to retrieve configurations.", err.message);
        return res.status(500).json({ error: "Error retrieving configurations." });
      }
      if (!rows.length) {
        return res.status(404).json({ message: "No configurations found." });
      }
      res.json({ success: true, configurations: rows });
    }
  );
});

// Load a specific configuration
app.get('/load-configuration', ensureAuthenticated, (req, res) => {
  const configId = req.query.id; // Ensure this is being passed correctly in the query string

  // console.log("Fetching configuration with ID:", configId); // Debug log to check the ID

  db.get(
    `SELECT configJson FROM configurations WHERE id = ? AND user_id = ?`,
    [configId, req.session.user.id],
    (err, row) => {
      if (err) {
        console.error("Database Error: Failed to load configuration.", err.message);
        return res.status(500).json({ error: "Error loading configuration." });
      }
      if (!row) {
        console.log("❌ Configuration not found for ID:", configId); // Log for missing config
        return res.status(404).json({ message: "Configuration not found." });
      }

      const fullConfig = JSON.parse(row.configJson);
      res.json({ success: true, configuration: fullConfig });
    }
  );
});

// Delete a configuration
app.delete('/delete-configuration', ensureAuthenticated, (req, res) => {
  const configId = req.query.id;

  db.run(
    `DELETE FROM configurations WHERE id = ? AND user_id = ?`,
    [configId, req.session.user.id],
    function (err) {
      if (err) {
        console.error("Database Error: Failed to delete configuration.", err.message);
        return res.status(500).json({ error: "Error deleting configuration." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Configuration not found or already deleted." });
      }
      res.json({ success: true, message: "Configuration deleted." });
    }
  );
});

// =======================
// 🔹 RESULTS API 🔹
// =======================

// Get user results
app.get('/get-results', ensureAuthenticated, (req, res) => {
  db.all(
    `SELECT id, result, timestamp FROM results WHERE user_id = ? ORDER BY timestamp DESC`,
    [req.session.user.id],
    (err, rows) => {
      if (err) {
        console.error("Database Error: Failed to retrieve results for user ID:", req.session.user.id, err.message);
        return res.status(500).json({ error: "Error retrieving results." });
      }
      if (!rows.length) {
        return res.status(404).json({ message: "No results found." });
      }
      res.json({ success: true, results: rows });
    }
  );
});

app.post('/save-result', ensureAuthenticated, (req, res) => {
  const result = req.body.result;
  const userId = req.session.user.id;

  if (!result) {
    return res.status(400).json({ error: "Result data is required." });
  }

  db.run('INSERT INTO results (user_id, result) VALUES (?, ?)', [userId, result], (err) => {
    if (err) {
      console.error("Database Error:", err.message);
      return res.status(500).json({ error: "Error saving result." });
    }
    res.json({ success: true, message: "Result saved successfully." });
  });
});

// =======================
// 🔹 ADMIN PANEL API 🔹
// =======================

app.get('/admin', ensureAuthenticated, authorize('owner'), (req, res) => {
  res.sendFile(path.join(__dirname, 'private/admin.html'));
});

function authorizeOwner(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Owner role required.' });
  }
  next();
}

app.get('/admin/get-users', authorizeOwner, async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, username, email, real_name, role, status, profile_picture,
                two_factor_enabled, last_login, created_at, updated_at
         FROM users`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "Database error." });
  }
});

app.post('/admin/update-user', authorizeOwner, async (req, res) => {
  try {
    const { id, username, email, real_name, role, status, profile_picture } = req.body;

    await dbRun(
      `UPDATE users SET username = ?, email = ?, real_name = ?, role = ?, status = ?, profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [username, email, real_name, role, status, profile_picture, id]
    );

    res.json({ message: "User updated successfully!" });
  } catch (err) {
    console.error("Error updating user:", err.message);
    res.status(500).json({ error: "Database error." });
  }
});

app.delete('/admin/delete-user', authorizeOwner, async (req, res) => {
  try {
      const { id } = req.body;
      await dbRun(`DELETE FROM users WHERE id = ?`, [id]);
      res.json({ message: "User deleted successfully!" });
  } catch (err) {
      console.error("Error deleting user:", err.message);
      res.status(500).json({ error: "Database error." });
  }
});

// =======================
// 🔹 START SERVER 🔹
// =======================

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  // console.log(`Access from other devices at http://<your-ip-address>:${PORT}`);
});