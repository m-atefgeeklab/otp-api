const express = require('express');
const { verifyOTPCode, sendOTPCode, followUpServiceData} = require('../controllers/serviceController');
const { createAndUpdateService } = require('../utils/validators/serviceValidator')

const router = express.Router();

router.post('/send-otp', sendOTPCode);
router.post('/verify-otp', verifyOTPCode);
router.post('/follow-up/:id', createAndUpdateService, followUpServiceData);

module.exports = router;
