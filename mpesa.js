// mpesa.js
const axios = require("axios");
const moment = require("moment");
require("dotenv").config();

const {
  MPESA_CONSUMER_KEY,
  MPESA_CONSUMER_SECRET,
  MPESA_SHORTCODE,
  MPESA_PASSKEY,
  BASE_URL,
} = process.env;

const getAccessToken = async () => {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get access token:", error.message);
    throw error;
  }
};

const lipaNaMpesa = async (phone, amount) => {
  const accessToken = await getAccessToken();
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");
  const formattedPhone = phone.startsWith("254") ? phone : phone.replace(/^0/, "254");

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: `${BASE_URL}/api/mpesa/callback`,
    AccountReference: "FundiLink",
    TransactionDesc: "Fundi payment",
  };

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ M-Pesa STK Push Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { lipaNaMpesa };
// routes/mpesa.js
const express = require('express');
const router = express.Router();

router.post('/callback', (req, res) => {
  console.log("✅ M-Pesa Callback received");
  console.log(JSON.stringify(req.body, null, 2));

  // You can extract values like this:
  const callbackData = req.body.Body?.stkCallback;
  const resultCode = callbackData?.ResultCode;
  const resultDesc = callbackData?.ResultDesc;

  if (resultCode === 0) {
    // Payment was successful
    const metadata = callbackData.CallbackMetadata;
    const phone = metadata?.Item?.find(i => i.Name === "PhoneNumber")?.Value;
    const amount = metadata?.Item?.find(i => i.Name === "Amount")?.Value;
    const receipt = metadata?.Item?.find(i => i.Name === "MpesaReceiptNumber")?.Value;

    console.log("✅ Payment Successful");
    console.log("Phone:", phone);
    console.log("Amount:", amount);
    console.log("Receipt:", receipt);

    // TODO: Save to database if needed
  } else {
    console.log("❌ Payment failed:", resultDesc);
  }

  // Respond to Safaricom
  res.status(200).json({ message: "Callback received successfully" });
});
CallbackURL: "https://fundilink-backend-1.onrender.com/api/mpesa/callback",

module.exports = router;
