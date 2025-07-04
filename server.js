require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');


const Fundi = require('./models/Fundi');
const Client = require('./models/Client');
const mpesaRoutes = require('./routes/mpesa');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Password checker
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
}

// Multer config
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

// Login (shared for fundis/clients)
// Enhanced Login Route with Debugging
app.post('/api/login', async (req, res) => {
  const { email, username, password } = req.body;

  console.log("🔐 Login request received:", { email, username });

  try {
    let user = await Fundi.findOne({ $or: [{ email }, { username }] });
    if (!user) {
      console.log("🔎 Not a fundi. Checking clients...");
      user = await Client.findOne({ $or: [{ email }, { username }] });
    }

    if (!user) {
      console.warn("❌ No user found with that identifier");
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("👤 User found:", user.username);

    if (!user.password) {
      console.error("❗ Password is undefined or missing for user:", user.username);
      return res.status(500).json({ error: 'Password not found for user' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn("❌ Incorrect password for:", user.username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role = user.skill ? 'fundi' : 'client';
    console.log(`✅ ${role.toUpperCase()} logged in successfully.`);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        photo: user.photo,
        role
      }
    });
  } catch (err) {
    console.error("💥 Login route crashed:", err);
    res.status(500).json({ error: 'Login failed internally' });
  }
});


// Fundi Registration
app.post('/api/fundis', upload.single('photo'), async (req, res) => {
  try {
    const {
      name, username, email, phone,
      skill, location, price, description,
      password, confirmPassword
    } = req.body;

    if (!name || !username || !email || !phone || !skill || !location || !price || !password || !confirmPassword)
      return res.status(400).json({ error: 'All fields are required' });

    if (password !== confirmPassword)
      return res.status(400).json({ error: 'Passwords do not match' });

    if (!isStrongPassword(password))
      return res.status(400).json({ error: 'Password must be 8+ chars, include upper/lowercase, number & special char.' });

    const exists = await Fundi.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({ error: exists.email === email ? 'Email already exists' : 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const newFundi = new Fundi({
      name, username, email, phone, skill, location,
      price, description, password: hashedPassword, photo
    });

    await newFundi.save();
    res.status(201).json({ message: 'Fundi registered successfully!' });
  } catch (err) {
    console.error('Fundi reg error:', err.message);
    res.status(500).json({ error: 'Fundi registration failed' });
  }
});

// Client Registration
app.post('/api/clients', upload.single('photo'), async (req, res) => {
  try {
    const {
      name, username, email, phone, location,
      password, confirmPassword
    } = req.body;

    if (!name || !username || !email || !phone || !location || !password || !confirmPassword)
      return res.status(400).json({ error: 'All fields are required' });

    if (password !== confirmPassword)
      return res.status(400).json({ error: 'Passwords do not match' });

    if (!isStrongPassword(password))
      return res.status(400).json({ error: 'Password must be 8+ chars, include upper/lowercase, number & special char.' });

    const exists = await Client.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(409).json({ error: exists.email === email ? 'Email already exists' : 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const newClient = new Client({ name, username, email, phone, location, password: hashedPassword, photo });

    await newClient.save();
    res.status(201).json({ message: 'Client registered successfully!' });
  } catch (err) {
    console.error('Client reg error:', err.message);
    res.status(500).json({ error: 'Client registration failed' });
  }
});

// Get all Fundis
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    res.json(fundis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

app.use('/api/mpesa', mpesaRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB error:', err));
