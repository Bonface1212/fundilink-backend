const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();

const {
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  BASE_URL
} = process.env;

// Function to generate M-Pesa access token
const getAccessToken = async () => {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');

  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );
    return response.data.access_token;
  } catch (err) {
    console.error("❌ Failed to get access token:", err.message);
    throw err;
  }
};

// Route to handle STK Push
router.post('/stk', async (req, res) => {
  const { phone, amount } = req.body;

  const formattedPhone = phone.replace(/^0/, '254'); // Convert 0712... to 254712...
  const timestamp = moment().format('YYYYMMDDHHmmss');
  const password = Buffer.from(MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).toString('base64');

  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: `${BASE_URL}/api/mpesa/callback`,
        AccountReference: 'FundiLink',
        TransactionDesc: 'Fundi Service Payment'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    console.log("📲 M-Pesa STK Push Response:", response.data);
    res.status(200).json({ message: '📲 M-Pesa STK Push sent! Complete payment on your phone.' });
  } catch (err) {
    console.error("❌ M-Pesa STK Push Error:", err.response?.data || err.message);
    res.status(500).json({ error: 'M-Pesa STK Push failed' });
  }
});

// Callback route from Safaricom
router.post('/callback', (req, res) => {
  console.log("📩 Callback received from Safaricom:");
  console.log(JSON.stringify(req.body, null, 2));

  // You can log this to DB or store transaction status here

  res.status(200).json({ message: '✅ Callback received' });
});

module.exports = router;
