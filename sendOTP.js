const twilio = require('twilio');
const ApiError = require('./apiError');

// Initialize Twilio client using environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Twilio-provided phone number

const client = twilio(accountSid, authToken);

/**
 * Sends an OTP via SMS using Twilio.
 * @param {string} phoneNumber - The phone number to send the OTP to.
 * @param {string} otp - The OTP to be sent.
 * @throws {ApiError} If there's an error sending the OTP.
 */
const sendOTP = async (phoneNumber, otp) => {
  try {
    await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: fromPhoneNumber,
      to: phoneNumber,
    });
  } catch (error) {
    throw new ApiError('Failed to send OTP', 500);
  }
};

module.exports = sendOTP;
