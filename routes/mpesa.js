// routes/mpesa.js
const express = require("express");
const router = express.Router();
const { lipaNaMpesa } = require("../mpesa");

// STK Push Route
router.post("/stk", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const response = await lipaNaMpesa(phone, amount);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "M-Pesa STK Push failed" });
  }
});

// (Optional) Callback Route for future use
router.post("/callback", (req, res) => {
  console.log("📞 M-Pesa callback received:", JSON.stringify(req.body, null, 2));
  res.status(200).send("Callback received");
});

module.exports = router;
