const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  phone:    { type: String, required: true },
  location: { type: String, required: true },
  password: { type: String, required: true },
  photo:    { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Client', clientSchema);
