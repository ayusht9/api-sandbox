const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table and insert sample data
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                description TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                method TEXT NOT NULL,
                UNIQUE(url, method)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user'
            )
        `, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            } else {
                // Check if data exists
                db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
                    if (row.count === 0) {
                        const insert = 'INSERT INTO products (name, description, price) VALUES (?,?,?)';
                        db.run(insert, ['Laptop', 'High-performance laptop', 1200.00]);
                        db.run(insert, ['Smartphone', 'Latest model smartphone', 800.00]);
                        db.run(insert, ['Headphones', 'Noise-canceling headphones', 150.00]);
                        console.log('Inserted sample data into products table.');
                    }
                });
            }
        });
    }
});

// RESTful API Routes

// --- Authentication Middleware & Endpoints ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    // Support Bearer Token
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Forbidden' });
            req.user = user;
            next();
        });
        return;
    }
    
    // Support Basic Auth (if we wanted to parse it, but for now we only issue JWTs. We can parse Basic for demo)
    if (authHeader && authHeader.startsWith('Basic ')) {
        const b64auth = authHeader.split(' ')[1];
        const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':');
        
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) return res.status(401).json({ error: 'Unauthorized' });
            req.user = { id: user.id, username: user.username, role: user.role };
            next();
        });
        return;
    }

    return res.status(401).json({ error: 'Unauthorized. Bearer or Basic token required.' });
}

function authenticateAdmin(req, res, next) {
    authenticateToken(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden. Admin access required.' });
        }
    });
}

app.post('/api/auth/register', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    
    const assignRole = role === 'admin' ? 'admin' : 'user';
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashedPassword, assignRole], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully', id: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'success', token });
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get('SELECT id, username, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'success', data: user });
    });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // JWTs are stateless, so logout is mostly a client-side action (discarding token).
    // We provide this endpoint to test client-side logout flow.
    res.json({ message: 'Logged out successfully. Please discard your token.' });
});

// GET all products (Protected)
app.get('/api/products', authenticateToken, (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// GET a single product by id (Protected)
app.get('/api/products/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json({
                message: 'success',
                data: row
            });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    });
});

// POST a new product (Protected)
app.post('/api/products', authenticateToken, (req, res) => {
    const { name, description, price } = req.body;
    if (!name || !price) {
        res.status(400).json({ error: 'Name and price are required' });
        return;
    }
    
    const insert = 'INSERT INTO products (name, description, price) VALUES (?,?,?)';
    db.run(insert, [name, description, price], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: { id: this.lastID, name, description, price }
        });
    });
});

// PUT (update) a product (Protected)
app.put('/api/products/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const { name, description, price } = req.body;
    
    db.run(
        'UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price) WHERE id = ?',
        [name, description, price, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                message: 'success',
                changes: this.changes
            });
        }
    );
});

// DELETE a product (Protected - Admin Only)
app.delete('/api/products/:id', authenticateAdmin, (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: 'deleted',
            changes: this.changes
        });
    });
});

// Auto-discovery endpoint
app.get('/api/endpoints', (req, res) => {
    const endpoints = [
        { path: '/api/products', methods: ['GET', 'POST'] },
        { path: '/api/products/:id', methods: ['GET', 'PUT', 'DELETE'] },
        { path: '/api/auth/register', methods: ['POST'] },
        { path: '/api/auth/login', methods: ['POST'] },
        { path: '/api/auth/me', methods: ['GET'] },
        { path: '/api/auth/logout', methods: ['POST'] },
        { path: '/api/endpoints', methods: ['GET'] }
    ];
    res.json({
        message: 'success',
        data: endpoints
    });
});

// --- Bookmarks API ---

app.get('/api/bookmarks', (req, res) => {
    db.all("SELECT * FROM bookmarks", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

app.post('/api/bookmarks', (req, res) => {
    const { url, method } = req.body;
    if (!url || !method) return res.status(400).json({ error: 'URL and method are required' });
    
    db.run("INSERT OR IGNORE INTO bookmarks (url, method) VALUES (?, ?)", [url, method], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'success', id: this.lastID });
    });
});

app.delete('/api/bookmarks', (req, res) => {
    // Usually DELETE requests use query params or URL params, but we can accept body too (some clients struggle, so we check query first)
    const url = req.query.url || req.body.url;
    const method = req.query.method || req.body.method;
    
    if (!url || !method) return res.status(400).json({ error: 'URL and method are required' });

    db.run("DELETE FROM bookmarks WHERE url = ? AND method = ?", [url, method], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', changes: this.changes });
    });
});

// --- CORS Proxy endpoint ---
app.post('/api/proxy', async (req, res) => {
    try {
        const { url, method, headers, data } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required for proxy' });
        }

        const cleanHeaders = { ...headers };
        delete cleanHeaders.host;
        delete cleanHeaders.origin;
        delete cleanHeaders.referer;

        const proxyRes = await axios({
            url,
            method: method || 'GET',
            headers: cleanHeaders,
            data
        });
        
        res.status(proxyRes.status).send(proxyRes.data);
    } catch (err) {
        if (err.response) {
            res.status(err.response.status).send(err.response.data);
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});
