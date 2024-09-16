const mongoose = require('mongoose');
const { parsePhoneNumberFromString } = require('libphonenumber-js'); // Ensure this library is installed

const serviceSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function (v) {
        try {
          // Validate phone number format
          return parsePhoneNumberFromString(this.ISD + v).isValid();
        } catch (err) {
          return false;
        }
      },
      message: 'Invalid phone number format.',
    },
  },
  ISD: {
    type: String,
    required: [true, 'ISD code is required'],
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
  },
  otp: {
    type: String,
    select: false, // Exclude OTP from query results for security
  },
  serviceData: {
    type: Map,
    of: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'finished'],
    default: 'pending', // Default status
  },
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual to verify if the address matches the phone number's country
serviceSchema.virtual('isAddressValid').get(function () {
  const phoneNumberInstance = parsePhoneNumberFromString(this.ISD + this.phoneNumber);
  if (phoneNumberInstance && phoneNumberInstance.isValid()) {
    const countryCode = phoneNumberInstance.country;
    // This could be a simple check or a lookup against a list of cities per country
    return this.countryCode === countryCode;
  }
  return false;
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
