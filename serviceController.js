const Service = require('../models/serviceModel');
const { formatPhoneNumber } = require('../utils/phoneUtils'); // Utility to format phone numbers
const otpGenerator = require('otp-generator');
const ApiError = require('../utils/apiError');
const sendOTP = require('../utils/sendOTP'); // Utility to send OTP via Twilio

// @desc Add Virtual Service Data
// @route POST /api/services/verify
exports.addVirtualServiceData = async (req, res, next) => {
  try {
    const { ISD, phone, serviceData, address, countryCode } = req.body;

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(ISD, phone);

    // Generate OTP
    const otp = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false, specialChars: false });

    // Save service data with OTP
    const service = new Service({
      phoneNumber: formattedPhone,
      ISD,
      address,
      serviceData,
      otp, // Save OTP for later verification
      countryCode // Ensure country code is included for address validation
    });

    await service.save();

    // Send OTP via SMS using Twilio
    await sendOTP(formattedPhone, otp);

    res.status(201).json({
      status: 'success',
      message: 'OTP sent successfully',
      data: {
        serviceId: service._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Verify OTP and save Service Data
// @route POST /api/services/verify-otp
exports.verifyOTPAndSaveServiceData = async (req, res, next) => {
  try {
    const { serviceId, code } = req.body;

    // Find the service by ID and include the OTP field
    const service = await Service.findById(serviceId).select('+otp');

    if (!service) {
      return next(new ApiError('Service not found', 404));
    }

    // Check if OTP matches
    if (service.otp !== code) {
      return next(new ApiError('Invalid OTP', 400));
    }

    // Set the service as verified
    service.isVerified = true;
    service.otp = undefined; // Clear OTP after successful verification
    await service.save();

    res.status(200).json({
      status: 'success',
      message: 'Phone number verified and service data saved',
      data: {
        serviceId: service._id,
        phoneVerified: service.isPhoneVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};
