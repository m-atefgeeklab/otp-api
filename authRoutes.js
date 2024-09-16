// routes/serviceRoutes.js

const express = require('express');
const serviceController = require('../controllers/serviceController');

const router = express.Router();

router.post('/verify', serviceController.addVirtualServiceData);
router.post('/verify-otp', serviceController.verifyOTPAndSaveServiceData);

// Route to update service status to 'finished'
router.patch('/:id/status', serviceController.updateServiceStatus);

// Route to get all services by status
router.get('/status/:status', serviceController.getServicesByStatus);

// Route to delete all finished services
router.delete('/finished', serviceController.deleteFinishedServices);

module.exports = router;
