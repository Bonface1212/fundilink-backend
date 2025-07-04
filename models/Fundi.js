const mongoose = require('mongoose');

const fundiSchema = new mongoose.Schema({
  name: String,
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  skill: String,
  location: String,
  price: Number,
  description: String,
  password: String,
  photo: String,
}, { timestamps: true });

module.exports = mongoose.model('Fundi', fundiSchema);
