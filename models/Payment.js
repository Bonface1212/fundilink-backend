const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  clientName: String,
  phone: String,
  amount: Number,
  transactionId: String,
  fundiId: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
