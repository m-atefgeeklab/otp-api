const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const serviceRoutes = require('./routes/serviceRoutes');
const globalErrorHandler = require('./middlewares/errorHandler');
const ApiError = require('./utils/apiError');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Middleware for parsing URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define routes
app.use('/api/services', serviceRoutes);

// Handle undefined routes
app.use('*', (req, res, next) => {
  next(new ApiError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(globalErrorHandler);

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
