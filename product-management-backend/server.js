require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 10000;

// CORS Configuration - Updated to be more permissive for development
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 200
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Database connected successfully');
    release();
});

// Database initialization
const initializeDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                is_admin BOOLEAN DEFAULT false
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                quantity INTEGER NOT NULL,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const adminExists = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);
        
        if (adminExists.rows.length === 0) {
            const adminPassword = await bcrypt.hash('admin123', 10);
            await pool.query(`
                INSERT INTO users (name, email, password, is_admin)
                VALUES ('Admin', 'admin@example.com', $1, true)
            `, [adminPassword]);
        }

        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initializeDatabase();

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
 
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
            [name, email, hashedPassword]
        );

        res.status(201).json({ 
            message: 'User created successfully',
            userId: result.rows[0].id
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Error creating user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, isAdmin: user.is_admin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            userId: user.id,
            isAdmin: user.is_admin,
            name: user.name
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Product Routes
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT products.*, users.name as user_name FROM products LEFT JOIN users ON products.user_id = users.id ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const { name, description, price, quantity } = req.body;
        const userId = req.user.userId;

        if (!name || !price || !quantity) {
            return res.status(400).json({ message: 'Name, price, and quantity are required' });
        }

        const result = await pool.query(
            'INSERT INTO products (name, description, price, quantity, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, price, quantity, userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ message: 'Error creating product' });
    }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, quantity } = req.body;
        const userId = req.user.userId;

        const product = await pool.query('SELECT user_id FROM products WHERE id = $1', [id]);
        
        if (product.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.rows[0].user_id !== userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to edit this product' });
        }

        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, quantity = $4 WHERE id = $5 RETURNING *',
            [name, description, price, quantity, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ message: 'Error updating product' });
    }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const product = await pool.query('SELECT user_id FROM products WHERE id = $1', [id]);
        
        if (product.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.rows[0].user_id !== userId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this product' });
        }

        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Internal server error', 
        error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`CORS enabled for origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
