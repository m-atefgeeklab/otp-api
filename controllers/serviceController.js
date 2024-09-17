const { CognitoIdentityProviderClient, AdminInitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const ApiError = require('../utils/apiError'); // Custom error handling
const { RespondToAuthChallengeCommand } = require('@aws-sdk/client-cognito-identity-provider');
const Service = require('../models/serviceModel'); // Assuming your model is stored here
const { formatPhoneNumber } = require('../helpers/phoneNumber'); 

const cognitoClient = new CognitoIdentityProviderClient({ region: 'your-region' });

// Controller for sending OTP
exports.sendCode = async (req, res, next) => {
  const { phoneNumber, ISD } = req.body;

  try {
    // Validate and format the phone number using libphonenumber-js
    const formattedPhoneNumber = formatPhoneNumber(ISD, phoneNumber);

    // Find or create the service entry
    const service = await Service.findOneAndUpdate(
      { phoneNumber, ISD },
      { phoneNumber, ISD, phoneVerified: false }, // Create or update service entry
      { new: true, upsert: true }
    );

    // Use Cognito to send an OTP to the formatted phone number
    const params = {
      AuthFlow: 'CUSTOM_AUTH',
      ClientId: 'your-cognito-client-id',
      AuthParameters: {
        USERNAME: formattedPhoneNumber, // Use the formatted phone number for verification
      },
    };

    const command = new AdminInitiateAuthCommand(params);
    await cognitoClient.send(command);

    res.status(200).json({ status: 'success', message: 'OTP sent to phone number' });
  } catch (error) {
    next(new ApiError(500, 'Failed to send OTP'));
  }
};

exports.verifyCode = async (req, res, next) => {
  const { phoneNumber, ISD, otpCode } = req.body;

  try {
    // Find the service associated with the phone number
    const service = await Service.findOne({ phoneNumber, ISD });

    if (!service) {
      return next(new ApiError(404, 'Service not found'));
    }

    const formattedPhoneNumber = formatPhoneNumber(ISD, phoneNumber);

    // Parameters to respond to the OTP challenge
    const params = {
      ChallengeName: 'CUSTOM_CHALLENGE',
      ClientId: 'your-cognito-client-id',
      ChallengeResponses: {
        USERNAME: formattedPhoneNumber, // Use the formatted phone number for verification
        ANSWER: otpCode, // OTP code provided by the user
      },
    };

    const command = new RespondToAuthChallengeCommand(params);
    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult) {
      // Update the service document upon successful OTP verification
      service.phoneVerified = true;
      await service.save();

      res.status(200).json({ status: 'success', message: 'Phone number verified successfully' });
    } else {
      res.status(400).json({ status: 'fail', message: 'OTP verification failed' });
    }
  } catch (error) {
    next(new ApiError(500, 'Failed to verify OTP'));
  }
};

exports.followUpService = async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Find the service by its ID
    const service = await Service.findById(id);

    if (!service) {
      return next(new ApiError(404, 'Service not found'));
    }

    // Check if the phone number has been verified
    if (!service.phoneVerified) {
      return next(new ApiError(400, 'Phone number not verified. Cannot update service.'));
    }

    // Update the service with the data provided in the request body
    Object.assign(service, updateData);

    // Save the updated service data
    await service.save();

    res.status(200).json({
      status: 'success',
      message: 'Service details updated successfully',
      data: service,
    });
  } catch (error) {
    next(new ApiError(500, 'Failed to update service details'));
  }
};
