const Service = require('../models/serviceModel');
const ApiError = require('../utils/apiError');

// @desc Update service status to finished
// @route PATCH /api/services/:id/status
exports.updateServiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the service by ID
    const service = await Service.findById(id);

    if (!service) {
      return next(new ApiError('Service not found', 404));
    }

    // Update the status to 'finished'
    service.status = 'finished';
    await service.save();

    res.status(200).json({
      status: 'success',
      message: 'Service status updated to finished',
      data: {
        service
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all services by status
// @route GET /api/services/status/:status
exports.getServicesByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;

    if (!['pending', 'finished'].includes(status)) {
      return next(new ApiError('Invalid status', 400));
    }

    const services = await Service.find({ status });

    res.status(200).json({
      status: 'success',
      results: services.length,
      data: {
        services
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete all finished services
// @route DELETE /api/services/finished
exports.deleteFinishedServices = async (req, res, next) => {
  try {
    // Delete all services with status 'finished'
    const result = await Service.deleteMany({ status: 'finished' });

    res.status(200).json({
      status: 'success',
      message: `${result.deletedCount} finished service(s) deleted`
    });
  } catch (error) {
    next(error);
  }
};
