// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'app.db');

// Ensure data directory
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

// open (or create) sqlite db
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) return console.error('DB open error:', err);
  console.log('Connected to SQLite DB at', DB_FILE);
});

// create users table if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Middleware
app.use(helmet());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: DB_DIR }),
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// helper: check auth
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.session.username || null });
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.render('register', { error: 'Fill all fields' });

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    stmt.run(username, hash, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.render('register', { error: 'Username already taken' });
        }
        console.error(err);
        return res.render('register', { error: 'Registration failed' });
      }
      // auto-login after register
      req.session.userId = this.lastID;
      req.session.username = username;
      return res.redirect('/dashboard');
    });
    stmt.finalize();
  } catch (e) {
    console.error(e);
    res.render('register', { error: 'Server error' });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.render('login', { error: 'Enter username and password' });

  db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      console.error(err);
      return res.render('login', { error: 'Server error' });
    }
    if (!row) return res.render('login', { error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return res.render('login', { error: 'Invalid credentials' });

    req.session.userId = row.id;
    req.session.username = row.username;
    return res.redirect('/dashboard');
  });
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.session.username });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// simple health endpoint for Jenkins / Docker checks
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
