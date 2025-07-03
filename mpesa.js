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
    const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
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

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone.startsWith("254") ? phone : phone.replace(/^0/, "254"), // Format phone
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phone.startsWith("254") ? phone : phone.replace(/^0/, "254"),
    CallBackURL: `${BASE_URL}/api/mpesa/callback`, // Use your server callback
    AccountReference: "FundiLink",
    TransactionDesc: "Fundi payment"
  };

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ M-Pesa STK Push Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { lipaNaMpesa };
