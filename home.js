cronJobs.js
javascript
Copy code
const cron = require('node-cron');
const mongoose = require('mongoose');
const Service = require('./models/serviceModel'); // Adjust the path as necessary
const ApiError = require('./utils/apiError');

// Function to delete finished services older than 60 days
const deleteOldFinishedServices = async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60); // Set the date to 60 days ago

    const result = await Service.deleteMany({
      status: 'finished',
      updatedAt: { $lt: cutoffDate } // Match services that have not been updated in the last 60 days
    });

    console.log(`${result.deletedCount} old finished service(s) deleted`);
  } catch (error) {
    console.error('Error deleting old finished services:', error);
  }
};

// Schedule the job to run daily at midnight
cron.schedule('0 0 * * *', deleteOldFinishedServices);
3. Integrate Cron Job with Your Server
You need to ensure that your cron job script is loaded when your server starts. You can include it in your server.js or a similar entry point.

server.js
javascript
Copy code
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const serviceRoutes = require('./routes/serviceRoutes');
const globalErrorHandler = require('./middlewares/globalErrorHandler');

// Database connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Middleware
app.use(express.json());

// Routes
app.use('/api/services', serviceRoutes);

// Global Error Handling
app.use(globalErrorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Include the cron job script
require('./cronJobs');