const express = require('express');
const { verifyCode, sendCode, followUpService} = require('../controllers/serviceController');
const { createAndUpdateService } = require('../utils/validators/serviceValidator')

const router = express.Router();

router.post('/send-otp', sendCode);
router.post('/verify-otp', verifyCode);
router.post('/follow-up/:id', createAndUpdateService, followUpService);

module.exports = router;
