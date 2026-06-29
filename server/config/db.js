const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'taskmanager',
      family: 4,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true,
    });
    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't exit — retry on next request (for serverless)
    isConnected = false;
  }
};

module.exports = connectDB;
