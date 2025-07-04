const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true }, // client name
  phone: { type: String, required: true },
  location: { type: String, required: true },
  message: { type: String, required: true },
  skill: { type: String, required: true }, // must match fundi.skill
  fundiId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  claimed: { type: Boolean, default: false },
  paidByFundi: { type: Boolean, default: false },
  paid: { type: Boolean, default: false }, // For future use (e.g., MPESA)
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
