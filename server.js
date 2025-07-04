require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Models
const Fundi = require('./models/Fundi');
const Client = require('./models/Client');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment'); // ← Ensure this exists
const mpesaRoutes = require('./routes/mpesa');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://fundilink-frontend.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
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

// Password strength validator
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);
}

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    return res.json({ token: 'secure-admin-token' });
  }
  return res.status(401).json({ message: 'Invalid credentials' });
});

// Login for Fundi or Client
app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    let user = await Fundi.findOne({ $or: [{ email: identifier }, { username: identifier }] }) ||
               await Client.findOne({ $or: [{ email: identifier }, { username: identifier }] });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const role = user.skill ? 'fundi' : 'client';
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
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register fundi
app.post('/api/fundis', upload.single('photo'), async (req, res) => {
  try {
    const { name, username, email, phone, skill, location, price, description, password, confirmPassword } = req.body;
    if (!name || !username || !email || !phone || !skill || !location || !price || !password || !confirmPassword)
      return res.status(400).json({ error: 'All fields are required' });

    if (password !== confirmPassword)
      return res.status(400).json({ error: 'Passwords do not match' });

    if (!isStrongPassword(password))
      return res.status(400).json({ error: 'Weak password' });

    const exists = await Fundi.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({ error: 'Email or username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    const newFundi = new Fundi({ name, username, email, phone, skill, location, price, description, password: hashedPassword, photo });

    await newFundi.save();
    res.status(201).json({ message: 'Fundi registered successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Fundi registration failed' });
  }
});

// Register client
app.post('/api/clients', upload.single('photo'), async (req, res) => {
  try {
    const { name, username, email, phone, location, password, confirmPassword } = req.body;

    if (!name || !username || !email || !phone || !location || !password || !confirmPassword)
      return res.status(400).json({ error: 'All fields are required' });

    if (password !== confirmPassword)
      return res.status(400).json({ error: 'Passwords do not match' });

    if (!isStrongPassword(password))
      return res.status(400).json({ error: 'Weak password' });

    const exists = await Client.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({ error: 'Email or username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    const newClient = new Client({ name, username, email, phone, location, password: hashedPassword, photo });

    await newClient.save();
    res.status(201).json({ message: 'Client registered successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Client registration failed' });
  }
});

// Fetch all fundis
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    res.json(fundis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

// Fetch all clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Admin delete & update fundis
app.delete('/api/fundis/:id', async (req, res) => {
  try {
    const deleted = await Fundi.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Fundi not found' });
    res.json({ message: 'Fundi deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete fundi failed' });
  }
});
app.put('/api/fundis/:id', async (req, res) => {
  try {
    const updated = await Fundi.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update fundi failed' });
  }
});

// Admin delete & update clients
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const deleted = await Client.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete client failed' });
  }
});
app.put('/api/clients/:id', async (req, res) => {
  try {
    const updated = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update client failed' });
  }
});

// Admin delete & update bookings
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete booking failed' });
  }
});
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update booking failed' });
  }
});

// Get all bookings
app.use('/api/bookings', bookingRoutes);

// Get all payments
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// M-Pesa routes
app.use('/api/mpesa', mpesaRoutes);

// DB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB error:', err));
