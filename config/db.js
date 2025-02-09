const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbURI = "mongodb://localhost:27017/CookieDB";

    // Connect to MongoDB
    await mongoose.connect(dbURI, {
      useNewUrlParser: true, // Ensures the new MongoDB connection string parser is used
      useUnifiedTopology: true, // Enables the new Server Discover and Monitoring engine
    });

    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);

    // Exit the process with a failure code (1) if the connection fails
    process.exit(1);
  }
};

module.exports = connectDB;
