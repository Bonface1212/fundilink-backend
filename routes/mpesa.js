const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();

const {
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET
} = process.env;

// Step 1: Generate access token
const generateToken = async () => {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: { Authorization: `Basic ${auth}` },
    }
  );
  return response.data.access_token;
};

// Step 2: STK Push
router.post('/stk', async (req, res) => {
  const { phone, amount } = req.body;

  try {
    const accessToken = await generateToken();
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const stkPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: 'https://my-callback.com/mpesa', // You can replace with your actual callback URL
      AccountReference: 'FundiLink',
      TransactionDesc: 'FundiLink Client Payment'
    };

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, data: response.data });

  } catch (error) {
    console.error('❌ M-Pesa STK Error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'STK Push failed', details: error.message });
  }
});

module.exports = router;
