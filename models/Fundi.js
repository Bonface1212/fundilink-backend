const mongoose = require('mongoose');

const fundiSchema = new mongoose.Schema({
  name: String,
  phone: String,
  skill: String,
  location: String,
  price: String,
  description: String,
  profilePicture: String, // 👈 add this line
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Fundi', fundiSchema);
