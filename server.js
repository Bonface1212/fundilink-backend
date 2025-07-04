require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const Fundi = require('./models/Fundi');
const User = require('./models/User');
const Client = require('./models/Client'); // Correct Client model import
const mpesaRoutes = require('./routes/mpesa');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, "uploads")));

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, ""))
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // Max 1MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed"), false);
    }
  }
});

// Register User
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("❌ User registration error:", err);
    res.status(500).json({ error: "Registration error" });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Login error" });
  }
});

// Register Fundi (with optional image)
app.post('/api/fundis', upload.single('photo'), async (req, res) => {
  try {
    const { name, phone, skill, location, price, description } = req.body;

    if (!name || !phone || !skill || !location || !price) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }

    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    const fundi = new Fundi({ name, phone, skill, location, price, description, photo });
    await fundi.save();
    res.status(201).json({ message: "Fundi registered successfully!" });
  } catch (error) {
    console.error("❌ Fundi registration error:", error);
    res.status(500).json({ error: 'Fundi registration failed' });
  }
});

// Register Client (with optional image)
app.post('/api/clients', upload.single('photo'), async (req, res) => {
  try {
    const { name, phone, location, password } = req.body;

    if (!name || !phone || !location || !password) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }

    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    // Note: Hashing client passwords is recommended before saving
    const newClient = new Client({ name, phone, location, password, photo });
    await newClient.save();

    res.status(201).json({ message: "Client registered successfully!" });
  } catch (error) {
    console.error("❌ Client registration error:", error);
    res.status(500).json({ error: 'Client registration failed', details: error.message });
  }
});

// ✅ Get All Fundis
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    res.json(fundis);
  } catch (error) {
    console.error("❌ Fetching fundis error:", error);
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

// ✅ Get All Clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (error) {
    console.error("❌ Fetching clients error:", error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// M-Pesa routes
app.use('/api/mpesa', mpesaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: "Server is running" });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));
