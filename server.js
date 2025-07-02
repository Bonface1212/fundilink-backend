require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Fundi = require('./models/Fundi');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error:", err));

// POST: Register Fundi
app.post('/api/fundis', async (req, res) => {
  try {
    const fundi = new Fundi(req.body);
    await fundi.save();
    res.status(201).json({ message: "Fundi registered!" });
  } catch (error) {
    console.error("❌ Registration error:", error.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

// GET: All Fundis
app.get('/api/fundis', async (req, res) => {
  try {
    const fundis = await Fundi.find();
    console.log("✅ Fundis from DB:", fundis);
    res.json(fundis);
  } catch (err) {
    console.error("❌ Failed to fetch fundis:", err.message);
    res.status(500).json({ error: 'Failed to fetch fundis' });
  }
});

// ✅ START SERVER (this was missing)
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
