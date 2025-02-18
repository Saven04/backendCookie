require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Correct way to get real client IP
const axios = require("axios");

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const User = require("./models/user"); // Ensure to import User model
const CookiePreferences = require("./models/cookiePreference"); // Import CookiePreferences model

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

// CORS Configuration
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
    process.exit(1);
  }
};
connectDB();

// Routes
app.use("/api", cookieRoutes);
app.use("/api/auth", authRoutes);

// Route to handle saving user's cookie preferences
app.post("/api/save-cookie-preferences", async (req, res) => {
  try {
    const { consentId, preferences } = req.body;

    // Ensure the consentId is associated with a valid user
    const user = await User.findOne({ consentId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if preferences already exist for this consentId
    let existingPreferences = await CookiePreferences.findOne({ consentId });
    if (existingPreferences) {
      // Update existing preferences
      existingPreferences.preferences = preferences;
      await existingPreferences.save();
      return res.status(200).json({ message: "Cookie preferences updated successfully" });
    }

    // Create a new CookiePreferences entry
    const newPreferences = new CookiePreferences({
      consentId,
      preferences,
    });

    await newPreferences.save();

    res.status(201).json({ message: "Cookie preferences saved successfully" });
  } catch (error) {
    console.error("❌ Error saving cookie preferences:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get the real client IP and fetch geolocation data from `ip-api.com`
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";

    // Convert IPv6-mapped IPv4 addresses (e.g., "::ffff:192.168.1.1") to IPv4
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);

    // Fetch geolocation data from `ip-api.com`
    const response = await axios.get(`http://ip-api.com/json/${clientIp}`);

    // Send response with IP and location
    res.json({
      ip: clientIp, // ✅ Ensures correct IPv4 address is sent
      city: response.data.city || "Unknown",
      region: response.data.regionName || "Unknown",
      country: response.data.country || "Unknown",
      isp: response.data.isp || "Unknown",
    });
  } catch (error) {
    console.error("❌ Error fetching IP info:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running on Render and healthy." });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
