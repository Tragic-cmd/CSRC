const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./users.db');

// Create the users table with new fields
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    real_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    password TEXT NOT NULL
  )`);
});

console.log("Database and users table created successfully.");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false, // Change to false to avoid empty sessions
  cookie: { secure: false } // Set to true if using HTTPS
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

// Serve static files from 'public' (accessible without authentication)
app.use(express.static(path.join(__dirname, 'public')));

// Serve private assets only for authenticated users
app.use('/private', ensureAuthenticated, express.static(path.join(__dirname, 'private')));

// Protected: Main tool page (Index) and Camera Sizer Script
app.get('/', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, 'private/index.html')));

app.get('/camera-server-sizer.js', ensureAuthenticated, (req, res) => {
  res.type('application/javascript'); // Explicit MIME type
  res.sendFile(path.join(__dirname, 'private/camera-server-sizer.js'));
});

// Fetch authenticated user data
app.get('/get-user', (req, res) => {
  console.log('Session Data:', req.session); // Debugging log

  if (!req.session.user || !req.session.user.id) {
    console.log('User not found in session');
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const userId = req.session.user.id; // Use ID instead of username
  const db = new sqlite3.Database('users.db');

  db.get('SELECT username, email, real_name, date_of_birth FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (!row) {
      console.log(`User ID '${userId}' not found in database`);
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(row);
  });

  db.close();
});

// Registration
app.post('/register', async (req, res) => {
  const { username, email, real_name, date_of_birth, password } = req.body;

  // Check if username or email already exists
  db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, email], async (err, row) => {
    if (row) return res.send('Username or email already exists.');

    const hash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, email, real_name, date_of_birth, password) VALUES (?, ?, ?, ?, ?)`,
      [username, email, real_name, date_of_birth, hash],
      function (err) {
        if (err) return res.send('Error registering user.');
        res.send('Registration successful. <a href="login.html">Login here</a>');
      }
    );
  });
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT id, username, password FROM users WHERE username = ?`, [username], async (err, row) => {
    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).send('Invalid credentials.');
    }
    
    // Store user ID in session
    req.session.user = { id: row.id, username: row.username };
    res.redirect('/');
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

// Update profile
app.post('/update-profile', ensureAuthenticated, (req, res) => {
  const { email, real_name, date_of_birth } = req.body;
  db.run('UPDATE users SET email = ?, real_name = ?, date_of_birth = ? WHERE username = ?', 
    [email, real_name, date_of_birth, req.session.user.username], (err) => {
      if (err) return res.send('Error updating profile.');
      res.send('Profile updated successfully. <a href="/profile">Go back</a>');
  });
});

// Change password
app.post('/update-password', ensureAuthenticated, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [req.session.user.username], async (err, row) => {
    if (!row || !(await bcrypt.compare(oldPassword, row.password))) {
      return res.send('Old password is incorrect.');
    }
    const hash = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE username = ?', [hash, req.session.user.username], (err) => {
      if (err) return res.send('Error updating password.');
      res.send('Password updated. <a href="/profile">Go back</a>');
    });
  });
});

app.post('/save-result', ensureAuthenticated, (req, res) => {
  const result = req.body.result;
  const userId = req.user.id; // Ensure `req.user` is populated from authentication

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

app.get('/get-results', ensureAuthenticated, (req, res) => {
  const userId = req.user.id;

  db.all('SELECT id, result, timestamp FROM results WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      console.error("Database Error:", err.message);
      return res.status(500).json({ error: "Error retrieving results." });
    }
    res.json(rows);
  });
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
    totalStorage REAL NOT NULL,
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
  const { siteName, cameraCount, retentionDays, totalStorage } = req.body;

  db.run(
    `INSERT INTO configurations (user_id, siteName, cameraCount, retentionDays, totalStorage) 
     VALUES (?, ?, ?, ?, ?)`,
    [req.session.user.id, siteName, cameraCount, retentionDays, totalStorage],
    function (err) {
      if (err) {
        console.error("Database Error: Failed to save configuration.", err.message);
        return res.status(500).json({ error: "Error saving configuration." });
      }
      res.json({ success: true, message: "Configuration saved.", id: this.lastID });
    }
  );
});

// Get saved configurations
app.get('/get-configurations', ensureAuthenticated, (req, res) => {
  db.all(
    `SELECT id, siteName, cameraCount, retentionDays, totalStorage, timestamp 
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
  const configId = req.query.id;

  db.get(
    `SELECT * FROM configurations WHERE id = ? AND user_id = ?`,
    [configId, req.session.user.id],
    (err, row) => {
      if (err) {
        console.error("Database Error: Failed to load configuration.", err.message);
        return res.status(500).json({ error: "Error loading configuration." });
      }
      if (!row) {
        return res.status(404).json({ message: "Configuration not found." });
      }
      res.json({ success: true, configuration: row });
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

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));