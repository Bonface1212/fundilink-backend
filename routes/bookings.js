// routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking'); // Make sure this model exists

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    console.error('❌ Error fetching bookings:', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create a new booking
router.post('/', async (req, res) => {
  try {
    const { name, phone, location, message } = req.body;

    if (!name || !phone || !location)
      return res.status(400).json({ error: 'Name, phone, and location are required' });

    const newBooking = new Booking({ name, phone, location, message });
    await newBooking.save();

    res.status(201).json({ message: 'Booking created successfully' });
  } catch (err) {
    console.error('❌ Error creating booking:', err.message);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});


module.exports = router;
