const express = require('express');
const { updateServiceStatus, getServicesByStatus, updateService } = require('../controllers/adminController');
const authService = require('../services/authService');
const { createAndUpdateService } = require('../utils/validators/serviceValidator')

const router = express.Router();

router.use(authService.protect);

router.use(authService.allowedTo('admin'));

// Route to update service status to 'finished'
router.patch('/:id/status', updateServiceStatus);

// Route to get all services by status
router.get('/status/:status', getServicesByStatus);

router.post('/service/:id/update', createAndUpdateService, updateService);

module.exports = router;
