require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Fundi = require('./models/Fundi');
const User = require('./models/User');
const mpesaRoutes = require('./routes/mpesa');
app.use('/api/mpesa', mpesaRoutes);

const app = express();
const PORT = process.env.PORT || 5000;

// Make uploads accessible
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Multer storage config for image uploads
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

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve images publicly

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
    console.error("❌ Fundi registration error:", error.message);
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
// M-Pesa STK Push Integration

const { lipaNaMpesa } = require('./routes/mpesa');
const mpesaRoutes = require('./routes/mpesa');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve images publicly
app.use('/api/mpesa', mpesaRoutes);

// M-Pesa STK Push Payment Endpoint
app.post('/api/mpesa/pay', async (req, res) => {
  const { phone, amount } = req.body;
  try {
    const result = await lipaNaMpesa(phone, amount);
    res.json(result);
  } catch (error) {
    console.error('M-Pesa STK error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// M-Pesa Callback Handler
app.post("/api/mpesa/callback", (req, res) => {
  console.log("📥 M-Pesa Callback Received:", req.body);

  // You can extract and store useful data from req.body.Body.stkCallback here
  const callbackData = req.body.Body?.stkCallback;

  // Example log
  if (callbackData?.ResultCode === 0) {
    console.log("✅ Payment Successful:", callbackData.CallbackMetadata);
  } else {
    console.log("❌ Payment Failed:", callbackData.ResultDesc);
  }

  res.status(200).json({ message: "Callback received successfully" });
});

// Import M-Pesa routes
const mpesaRoutes = require('./routes/mpesa');
app.use('/api/mpesa', mpesaRoutes);


app.post('/api/mpesa/pay', async (req, res) => {
  const { phone, amount } = req.body;
  try {
    const result = await lipaNaMpesa(phone, amount);
    res.json(result);
  } catch (error) {
    console.error('M-Pesa STK error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initiation failed' });
  }// M-Pesa Callback Handler
app.post("/api/mpesa/callback", (req, res) => {
  console.log("📥 M-Pesa Callback Received:", req.body);

  // You can extract and store useful data from req.body.Body.stkCallback here
  const callbackData = req.body.Body?.stkCallback;
  
  // Example log
  if (callbackData?.ResultCode === 0) {
    console.log("✅ Payment Successful:", callbackData.CallbackMetadata);
  } else {
    console.log("❌ Payment Failed:", callbackData.ResultDesc);
  }

  res.status(200).json({ message: "Callback received successfully" });
});

});

app.use(express.json({ type: 'application/json' }));
