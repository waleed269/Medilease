// db.js — Connects our Express server to MongoDB Atlas using Mongoose
// The URI is stored in .env so credentials are never hardcoded

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // mongoose.connect returns a promise, so we await it
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error and exit the process
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
};

module.exports = connectDB;