require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Fundi = require('./models/Fundi');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve images publicly

// Multer storage config for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads'); // folder must exist
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Register User
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: "Login error" });
  }
});

// Register Fundi (with or without image)
app.post('/api/fundis', upload.single('profilePicture'), async (req, res) => {
  try {
    // If using form-data with image
    if (req.file) {
      const { name, phone, skill, location, price, description } = req.body;
      const profilePicture = `/uploads/${req.file.filename}`;
      const fundi = new Fundi({ name, phone, skill, location, price, description, profilePicture });
      await fundi.save();
      return res.status(201).json({ message: 'Fundi registered successfully' });
    }
    // If using JSON body (no image)
    const fundi = new Fundi(req.body);
    await fundi.save();
    res.status(201).json({ message: "Fundi registered!" });
  } catch (error) {
    console.error("❌ Error in fundi registration:", error.message);
    res.status(500).json({ error: 'Fundi registration failed' });
  }
});

// Get All Fundis
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    res.json(fundis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => console.log("❌ MongoDB error:", err));

