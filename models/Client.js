const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  phone: String,
  location: String,
  password: String,
  photo: String
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
