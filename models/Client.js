// filepath: fundilink-backend/models/Client.js
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  password: { type: String, required: true }, // Hash in production!
  photo: { type: String }
});

module.exports = mongoose.model('Client', clientSchema);