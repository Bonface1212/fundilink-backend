// ===== server.js (with password validation and confirmation) =====
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const Fundi = require('./models/Fundi');
const Client = require('./models/Client');
const mpesaRoutes = require('./routes/mpesa');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Password strength checker
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
}

// Multer config for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, ''))
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG and PNG images allowed'), false);
  }
});

// ===== User Login (Client or Fundi) =====
app.post('/api/login', async (req, res) => {
  const { email, username, password } = req.body;
  try {
    let user = await Fundi.findOne({ $or: [{ email }, { username }] });
    if (!user) user = await Client.findOne({ $or: [{ email }, { username }] });
    if (!user) return res.status(404).json({ error: 'User not found' });

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

// ===== Fundi Registration =====
app.post('/api/fundis', upload.single('photo'), async (req, res) => {
  try {
    const { name, username, email, phone, skill, location, price, description, password } = req.body;

    if (!name || !username || !email || !phone || !skill || !location || !price || !password)
      return res.status(400).json({ error: 'All fields required' });

    if (!isStrongPassword(password))
      return res.status(400).json({ error: 'Password must include lowercase, uppercase, number, special character, and be 8+ characters long.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const newFundi = new Fundi({ name, username, email, phone, skill, location, price, description, password: hashedPassword, photo });
    await newFundi.save();

    res.status(201).json({ message: 'Fundi registered successfully!' });
  } catch (err) {
    console.error('❌ Fundi registration error:', err.message);
    res.status(500).json({ error: 'Fundi registration failed' });
  }
});

// ===== Client Registration =====
app.post('/api/clients', upload.single('photo'), async (req, res) => {
  try {
    const { name, username, email, phone, location, password } = req.body;

    if (!name || !username || !email || !phone || !location || !password)
      return res.status(400).json({ error: 'All fields required' });

    if (!isStrongPassword(password))
      return res.status(400).json({ error: 'Password must include lowercase, uppercase, number, special character, and be 8+ characters long.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const newClient = new Client({ name, username, email, phone, location, password: hashedPassword, photo });
    await newClient.save();

    res.status(201).json({ message: 'Client registered successfully!' });
  } catch (err) {
    console.error('❌ Client registration error:', err.message);
    res.status(500).json({ error: 'Client registration failed' });
  }
});

// ===== Get All Fundis =====
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    res.json(fundis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

// ===== M-Pesa Routes =====
app.use('/api/mpesa', mpesaRoutes);

// ===== Start Server =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
