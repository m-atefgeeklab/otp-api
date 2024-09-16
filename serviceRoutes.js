const express = require('express');
const serviceController = require('../controllers/serviceController');

const router = express.Router();

router.post('/verify', serviceController.addVirtualServiceData);
router.post('/verify-otp', serviceController.verifyOTPAndSaveServiceData);

module.exports = router;
