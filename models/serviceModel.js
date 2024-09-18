const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
  },
  ISD: {
    type: String,
    required: [true, 'ISD code is required'],
  },
  addressLineOne: {
    type: String,
  },
  addressLineTwo: {
    type: String,
  },
  city: {
    type: String,
  },
  country: {
    type: String,
  },
  email: {
    type: String,
  },
  fullName: {
    type: String,
  },
  adminNote: {
    type: String,
  },
  userNote: {
    type: String,
  },
  otpCode: {
    type: String,
  },
  otpCodeExpires: {
    type: Date,
    index: true,
  },
  phoneVerified: {
    type: Boolean,
  },
  status: {
    type: String,
    enum: ['pending', 'finished'],
    default: 'pending', // Default status
  },
}, {
  timestamps: true,
});


const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
