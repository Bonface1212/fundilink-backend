require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Fundi = require('./models/Fundi');
const User = require('./models/User');
const Client = require('./models/Client');
const mpesaRoutes = require('./routes/mpesa');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Multer config for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, ""))
});
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed"), false);
    }
  }
});

// ========= CLIENT ROUTES =========

// Register Client
app.post('/api/clients', upload.single('photo'), async (req, res) => {
  try {
    const { name, username, email, phone, location, password } = req.body;

    if (!name || !username || !email || !phone || !location || !password) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const client = new Client({ name, username, email, phone, location, password: hashedPassword, photo });
    await client.save();
    res.status(201).json({ message: "Client registered successfully!" });
  } catch (error) {
    console.error("❌ Client registration error:", error.message);
    res.status(500).json({ error: "Client registration failed" });
  }
});

// Client Login
app.post('/api/clients/login', async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const client = await Client.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!client) return res.status(404).json({ error: "Client not found" });

    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    res.status(200).json({
      client: {
        id: client._id,
        name: client.name,
        username: client.username,
        email: client.email,
        phone: client.phone,
        location: client.location,
        photo: client.photo
      }
    });
  } catch (err) {
    console.error("❌ Client login error:", err.message);
    res.status(500).json({ error: "Client login failed" });
  }
});

// ========= FUNDI ROUTES =========

// Register Fundi
app.post("/api/fundis", upload.single("photo"), async (req, res) => {
  try {
    const { name, username, email, phone, skill, location, price, description, password } = req.body;

    if (!name || !username || !email || !phone || !skill || !location || !price || !password) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const fundi = new Fundi({
      name,
      username,
      email,
      phone,
      skill,
      location,
      price,
      description,
      photo,
      password: hashedPassword
    });

    await fundi.save();
    res.status(201).json({ message: "Fundi registered successfully!" });
  } catch (error) {
    console.error("❌ Fundi registration error:", error.message);
    res.status(500).json({ error: "Fundi registration failed" });
  }
});

// Fundi Login
app.post("/api/fundis/login", async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const fundi = await Fundi.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!fundi) return res.status(404).json({ error: "Fundi not found" });

    const isMatch = await bcrypt.compare(password, fundi.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    res.status(200).json({
      fundi: {
        id: fundi._id,
        name: fundi.name,
        username: fundi.username,
        email: fundi.email,
        phone: fundi.phone,
        skill: fundi.skill,
        location: fundi.location,
        price: fundi.price,
        photo: fundi.photo
      }
    });
  } catch (err) {
    console.error("❌ Fundi login error:", err.message);
    res.status(500).json({ error: "Fundi login failed" });
  }
});

// ========= GET FUNDIS =========
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    res.json(fundis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

// ========= MPESA ROUTES =========
app.use('/api/mpesa', mpesaRoutes);

// ========= CONNECT TO DB & START SERVER =========
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => console.log("❌ MongoDB connection error:", err));
