const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 5002);
const JWT_SECRET = process.env.JWT_SECRET || 'clothing-secret-key';

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

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
};

// Initialize database tables
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      ALTER TABLE clothing
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS outfits (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS outfit_items (
        id SERIAL PRIMARY KEY,
        outfit_id INTEGER REFERENCES outfits(id) ON DELETE CASCADE,
        clothing_id INTEGER REFERENCES clothing(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(outfit_id, clothing_id)
      )
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

initDB();

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name || '', normalizedEmail, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [normalizedEmail, req.user.id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email',
      [String(name || '').trim(), normalizedEmail, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/auth/me/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use('/api/clothing', authenticateToken);

// CRUD Routes
app.get('/api/clothing', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clothing WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/clothing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clothing WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clothing item not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clothing', upload.single('image'), async (req, res) => {
  try {
    const { name, category, size, color, price, stock } = req.body;
    let image_url = null;

    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      'INSERT INTO clothing (name, category, size, color, price, stock, image_url, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, category, size, color, price, stock, image_url, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/clothing/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, size, color, price, stock } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      'UPDATE clothing SET name = $1, category = $2, size = $3, color = $4, price = $5, stock = $6, image_url = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 AND user_id = $9 RETURNING *',
      [name, category, size, color, price, stock, image_url, id, req.user.id]
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

app.delete('/api/clothing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clothing WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clothing item not found' });
    }
    res.json({ message: 'Clothing item deleted successfully' });
  } catch (error) {
    console.error('Error deleting clothing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Outfit Routes
app.get('/api/outfits', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'category', c.category,
            'size', c.size,
            'color', c.color,
            'price', c.price,
            'image_url', c.image_url
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]') as items
      FROM outfits o
      LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
      LEFT JOIN clothing c ON oi.clothing_id = c.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching outfits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/outfits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT o.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'category', c.category,
            'size', c.size,
            'color', c.color,
            'price', c.price,
            'image_url', c.image_url
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]') as items
      FROM outfits o
      LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
      LEFT JOIN clothing c ON oi.clothing_id = c.id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id
    `, [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outfit not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching outfit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/outfits', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, items } = req.body;
    
    await client.query('BEGIN');
    
    const outfitResult = await client.query(
      'INSERT INTO outfits (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, req.user.id]
    );
    
    const outfitId = outfitResult.rows[0].id;
    
    if (items && items.length > 0) {
      for (const clothingId of items) {
        await client.query(
          'INSERT INTO outfit_items (outfit_id, clothing_id) VALUES ($1, $2)',
          [outfitId, clothingId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    const finalResult = await pool.query(`
      SELECT o.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'category', c.category,
            'size', c.size,
            'color', c.color,
            'price', c.price,
            'image_url', c.image_url
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]') as items
      FROM outfits o
      LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
      LEFT JOIN clothing c ON oi.clothing_id = c.id
      WHERE o.id = $1
      GROUP BY o.id
    `, [outfitId]);
    
    res.status(201).json(finalResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating outfit:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.put('/api/outfits/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, description, items } = req.body;
    
    await client.query('BEGIN');
    
    const outfitResult = await client.query(
      'UPDATE outfits SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, description || null, id, req.user.id]
    );
    
    if (outfitResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Outfit not found' });
    }
    
    await client.query('DELETE FROM outfit_items WHERE outfit_id = $1', [id]);
    
    if (items && items.length > 0) {
      for (const clothingId of items) {
        await client.query(
          'INSERT INTO outfit_items (outfit_id, clothing_id) VALUES ($1, $2)',
          [id, clothingId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    const finalResult = await pool.query(`
      SELECT o.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', c.id,
            'name', c.name,
            'category', c.category,
            'size', c.size,
            'color', c.color,
            'price', c.price,
            'image_url', c.image_url
          )
        ) FILTER (WHERE c.id IS NOT NULL), '[]') as items
      FROM outfits o
      LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
      LEFT JOIN clothing c ON oi.clothing_id = c.id
      WHERE o.id = $1
      GROUP BY o.id
    `, [id]);
    
    res.json(finalResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating outfit:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

app.delete('/api/outfits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM outfits WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outfit not found' });
    }
    res.json({ message: 'Outfit deleted successfully' });
  } catch (error) {
    console.error('Error deleting outfit:', error);
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
