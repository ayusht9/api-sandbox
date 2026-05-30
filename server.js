const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

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
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL
        )`, (err) => {
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

// GET all products
app.get('/api/products', (req, res) => {
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

// GET a single product by id
app.get('/api/products/:id', (req, res) => {
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

// POST a new product
app.post('/api/products', (req, res) => {
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

// PUT (update) a product
app.put('/api/products/:id', (req, res) => {
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

// DELETE a product
app.delete('/api/products/:id', (req, res) => {
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
        { path: '/api/endpoints', methods: ['GET'] }
    ];
    res.json({
        message: 'success',
        data: endpoints
    });
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
