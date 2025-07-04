require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const Fundi = require('./models/Fundi');
const Client = require('./models/Client');
const User = require('./models/User');
const mpesaRoutes = require('./routes/mpesa');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, ''))
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // Max 1MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG and PNG images allowed'), false);
  }
});

// ===== USER LOGIN (both fundi and client) =====
app.post('/api/login', async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // Try both fundi and client collections
    let user = await Fundi.findOne({
      $or: [{ email }, { username }]
    });

    if (!user) {
      user = await Client.findOne({
        $or: [{ email }, { username }]
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        photo: user.photo,
        role: user.skill ? 'fundi' : 'client'
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ===== FUNDIS =====

// Register Fundi
app.post('/api/fundis', upload.single('photo'), async (req, res) => {
  try {
    const { name, username, email, phone, skill, location, price, description, password } = req.body;

    if (!name || !username || !email || !phone || !skill || !location || !price || !password) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const newFundi = new Fundi({
      name,
      username,
      email,
      phone,
      skill,
      location,
      price,
      description,
      password: hashedPassword,
      photo
    });

    await newFundi.save();
    res.status(201).json({ message: 'Fundi registered successfully!' });
  } catch (error) {
    console.error('❌ Fundi registration error:', error.message);
    res.status(500).json({ error: 'Fundi registration failed' });
  }
});

// Get all Fundis
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    res.json(fundis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

// ===== CLIENTS =====

// Register Client
app.post('/api/clients', upload.single('photo'), async (req, res) => {
  try {
    const { name, username, email, phone, location, password } = req.body;

    if (!name || !username || !email || !phone || !location || !password) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const newClient = new Client({
      name,
      username,
      email,
      phone,
      location,
      password: hashedPassword,
      photo
    });

    await newClient.save();
    res.status(201).json({ message: 'Client registered successfully!' });
  } catch (error) {
    console.error('❌ Client registration error:', error.message);
    res.status(500).json({ error: 'Client registration failed' });
  }
});

// ===== M-PESA Integration =====
app.use('/api/mpesa', mpesaRoutes);

// ===== MongoDB & Server Init =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => console.log('❌ MongoDB error:', err));
