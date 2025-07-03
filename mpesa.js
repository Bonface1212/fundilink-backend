// routes/mpesa.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const {
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  BASE_URL,
} = process.env;

const getAccessToken = async () => {
  const auth =
    Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');

  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  return response.data.access_token;
};

router.post('/stk-push', async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: 'Phone and amount are required' });
  }

  try {
    const accessToken = await getAccessToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, -3);

    const password = Buffer.from(
      `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const stkPushData = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone.startsWith('254') ? phone : phone.replace(/^0/, '254'),
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phone.startsWith('254') ? phone : phone.replace(/^0/, '254'),
      CallBackURL: `${BASE_URL}/api/mpesa/callback`,
      AccountReference: 'FundiLink',
      TransactionDesc: 'FundiLink payment',
    };

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ STK Push Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'STK Push failed' });
  }
});

router.post('/callback', (req, res) => {
  console.log('📥 M-Pesa Callback:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ message: 'Callback received successfully' });
});

module.exports = router;
