const {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const ApiError = require("../utils/apiError");
const {
  AdminRespondToAuthChallengeCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const Service = require("../models/serviceModel");
const { formatPhoneNumber } = require("../helpers/phoneNumber");
const asyncHandler = require("express-async-handler");
const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-west-2",
}); // Replace with your region

exports.sendOTPCode = async (phoneNumber, ISD) => {
  const formattedPhoneNumber = formatPhoneNumber(ISD, phoneNumber); // Format the phone number using your utility

  const params = {
    AuthFlow: "CUSTOM_AUTH", // For OTP handling
    ClientId: process.env.COGNITO_CLIENT_ID,
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    AuthParameters: {
      USERNAME: formattedPhoneNumber,
    },
  };

  try {
    const command = new AdminInitiateAuthCommand(params);
    const response = await cognitoClient.send(command);

    if (!response || !response.AuthenticationResult) {
      throw new ApiError("Failed to send OTP", 500);
    }

    // Optionally, save the OTP code and expiry in your database
    const otpCode = response.AuthenticationResult.AccessToken; // Example (could be replaced)
    const otpCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    // Update the service model with the OTP code and expiry
    await Service.updateOne(
      { phoneNumber: formattedPhoneNumber },
      {
        otpCode,
        otpCodeExpires,
      }
    );

    return response;
  } catch (error) {
    throw new ApiError(`Failed to send OTP: ${error.message}`, 500);
  }
};

exports.verifyOTPCode = async (phoneNumber, ISD, enteredCode) => {
  const formattedPhoneNumber = formatPhoneNumber(ISD, phoneNumber);

  const service = await Service.findOne({ phoneNumber: formattedPhoneNumber });
  if (!service) {
    throw new ApiError("Service not found", 404);
  }

  if (service.otpCodeExpires < Date.now()) {
    throw new ApiError("OTP code has expired", 400);
  }

  // Verify OTP using AWS Cognito
  const params = {
    ChallengeName: "CUSTOM_CHALLENGE",
    ClientId: process.env.COGNITO_CLIENT_ID,
    ChallengeResponses: {
      USERNAME: formattedPhoneNumber,
      ANSWER: enteredCode, // User-entered OTP code
    },
  };

  try {
    const command = new AdminRespondToAuthChallengeCommand(params);
    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult) {
      // Mark the phone number as verified in the database
      service.phoneVerified = true;
      service.status = "finished";
      await service.save();

      return { success: true, message: "Phone number verified successfully" };
    } else {
      throw new ApiError("OTP verification failed", 400);
    }
  } catch (error) {
    throw new ApiError(`Failed to verify OTP: ${error.message}`, 500);
  }
};

/**
 * Updates service data after phone verification.
 * @param {Object} req - The request object containing service data.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
exports.followUpServiceData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      addressLineOne,
      addressLineTwo,
      city,
      country,
      fullName,
      email,
      userNote,
      periodDate,
      periodFullTime,
    } = req.body;

    // Find the service by the phone number
    const service = await Service.findOne(id);

    if (!service) {
      throw new ApiError("Service not found", 404);
    }

    // Check if the phone number has been verified
    if (!service.phoneVerified || !service.emailVerified) {
      return next(new ApiError(400, 'Phone number or email not verified'));
    }

    // Update the service with the remaining data
    service.addressLineOne = addressLineOne || service.addressLineOne;
    service.addressLineTwo = addressLineTwo || service.addressLineTwo;
    service.city = city || service.city;
    service.country = country || service.country;
    service.fullName = fullName || service.fullName;
    service.email = email || service.email;
    service.userNote = userNote || service.userNote;
    service.periodFullTime = periodFullTime || service.periodFullTime;

    // Update the new period fields
    service.periodDate = periodDate || service.periodDate;
  
    // Save the updated service
    await service.save();

    res.status(200).json({
      success: true,
      message: "Service data updated successfully",
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to email
// @route   POST /api/v1/services/sendOTP
// @access  Public
exports.sendOTPToEmailAddress = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  // 1) Get service by email
  const service = await Service.findOne({ email });
  if (!service) {
    return next(new ApiError(`No service found with email: ${email}`, 404));
  }

  // 2) Generate a 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the OTP code before saving it
  const hashedOTPCode = crypto
    .createHash("sha256")
    .update(otpCode)
    .digest("hex");

  // Set OTP and expiration (10 minutes)
  service.otpCode = hashedOTPCode;
  service.otpCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  await service.save();

  // 3) Send OTP via email
  try {
    await sendEmail(
      email,
      "Your OTP Code (Valid for 10 min)",
      verifyEmailTemplate(otpCode)
    );
    res.status(200).json({ status: "Success", message: "OTP sent to email" });
  } catch (error) {
    // If email sending fails, clear the OTP details from the service model
    service.otpCode = undefined;
    service.otpCodeExpires = undefined;
    await service.save();

    return next(new ApiError("Error sending OTP to email", 500));
  }
});

// @desc    Verify OTP code
// @route   POST /api/v1/services/verifyOTP
// @access  Public
exports.verifyEmailAddress = asyncHandler(async (req, res, next) => {
  const { email, otpCode } = req.body;

  // 1) Hash the input OTP
  const hashedOTPCode = crypto
    .createHash("sha256")
    .update(otpCode)
    .digest("hex");

  // 2) Find service by email and valid OTP
  const service = await Service.findOne({
    email,
    otpCode: hashedOTPCode,
    otpCodeExpires: { $gt: Date.now() }, // Ensure OTP is still valid
  });

  if (!service) {
    return next(new ApiError("Invalid or expired OTP", 400));
  }

  // 3) Mark email as verified
  service.emailVerified = true;
  service.otpCode = undefined; // Clear OTP once verified
  service.otpCodeExpires = undefined; // Clear expiration
  await service.save();

  res.status(200).json({
    status: "Success",
    message: "Email successfully verified",
  });
});

// const cognitoClient = new CognitoIdentityProviderClient({ region: 'your-region' });

// // Controller for sending OTP
// exports.sendCode = async (req, res, next) => {
//   const { phoneNumber, ISD } = req.body;

//   try {
//     // Validate and format the phone number using libphonenumber-js
//     const formattedPhoneNumber = formatPhoneNumber(ISD, phoneNumber);

//     // Find or create the service entry
//     const service = await Service.findOneAndUpdate(
//       { phoneNumber, ISD },
//       { phoneNumber, ISD, phoneVerified: false }, // Create or update service entry
//       { new: true, upsert: true }
//     );

//     // Use Cognito to send an OTP to the formatted phone number
//     const params = {
//       AuthFlow: 'CUSTOM_AUTH',
//       ClientId: 'your-cognito-client-id',
//       AuthParameters: {
//         USERNAME: formattedPhoneNumber, // Use the formatted phone number for verification
//       },
//     };

//     const command = new AdminInitiateAuthCommand(params);
//     await cognitoClient.send(command);

//     res.status(200).json({ status: 'success', message: 'OTP sent to phone number' });
//   } catch (error) {
//     next(new ApiError(500, 'Failed to send OTP'));
//   }
// };

// exports.verifyCode = async (req, res, next) => {
//   const { phoneNumber, ISD, otpCode } = req.body;

//   try {
//     // Find the service associated with the phone number
//     const service = await Service.findOne({ phoneNumber, ISD });

//     if (!service) {
//       return next(new ApiError(404, 'Service not found'));
//     }

//     const formattedPhoneNumber = formatPhoneNumber(ISD, phoneNumber);

//     // Parameters to respond to the OTP challenge
//     const params = {
//       ChallengeName: 'CUSTOM_CHALLENGE',
//       ClientId: 'your-cognito-client-id',
//       ChallengeResponses: {
//         USERNAME: formattedPhoneNumber, // Use the formatted phone number for verification
//         ANSWER: otpCode, // OTP code provided by the user
//       },
//     };

//     const command = new RespondToAuthChallengeCommand(params);
//     const response = await cognitoClient.send(command);

//     if (response.AuthenticationResult) {
//       // Update the service document upon successful OTP verification
//       service.phoneVerified = true;
//       await service.save();

//       res.status(200).json({ status: 'success', message: 'Phone number verified successfully' });
//     } else {
//       res.status(400).json({ status: 'fail', message: 'OTP verification failed' });
//     }
//   } catch (error) {
//     next(new ApiError(500, 'Failed to verify OTP'));
//   }
// };

// exports.followUpService = async (req, res, next) => {
//   const { id } = req.params;
//   const updateData = req.body;

//   try {
//     // Find the service by its ID
//     const service = await Service.findById(id);

//     if (!service) {
//       return next(new ApiError(404, 'Service not found'));
//     }

//     // Check if the phone number has been verified
//     if (!service.phoneVerified) {
//       return next(new ApiError(400, 'Phone number not verified. Cannot update service.'));
//     }

//     // Update the service with the data provided in the request body
//     Object.assign(service, updateData);

//     // Save the updated service data
//     await service.save();

//     res.status(200).json({
//       status: 'success',
//       message: 'Service details updated successfully',
//       data: service,
//     });
//   } catch (error) {
//     next(new ApiError(500, 'Failed to update service details'));
//   }
// };
