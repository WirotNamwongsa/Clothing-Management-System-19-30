const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 5002);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'clothing_db',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || 'postgres'),
});

// Initialize database table
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clothing (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        size VARCHAR(50) NOT NULL,
        color VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database table initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

initDB();

// CRUD Routes

// GET all clothing items
app.get('/api/clothing', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clothing ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single clothing item
app.get('/api/clothing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clothing WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clothing item not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new clothing item
app.post('/api/clothing', upload.single('image'), async (req, res) => {
  try {
    const { name, category, size, color, price, stock } = req.body;
    let image_url = null;
    
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }
    
    const result = await pool.query(
      'INSERT INTO clothing (name, category, size, color, price, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, category, size, color, price, stock, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update clothing item
app.put('/api/clothing/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, size, color, price, stock } = req.body;
    let image_url = req.body.image_url;
    
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }
    
    const result = await pool.query(
      'UPDATE clothing SET name = $1, category = $2, size = $3, color = $4, price = $5, stock = $6, image_url = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [name, category, size, color, price, stock, image_url, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clothing item not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE clothing item
app.delete('/api/clothing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clothing WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clothing item not found' });
    }
    res.json({ message: 'Clothing item deleted successfully' });
  } catch (error) {
    console.error('Error deleting clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
