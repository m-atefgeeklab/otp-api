const express = require('express');
const { verifyOTPCode, sendOTPCode, followUpService} = require('../controllers/serviceController');
const { createAndUpdateService } = require('../utils/validators/serviceValidator')

const router = express.Router();

router.post('/send-otp', sendOTPCode);
router.post('/verify-otp', verifyOTPCode);
router.post('/follow-up/:id', createAndUpdateService, followUpService);

module.exports = router;
