require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Middleware to get real client IP
const axios = require("axios");
const crypto = require("crypto"); 

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const User = require("./models/user");
const CookiePreferences = require("./models/cookiePreference");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

// CORS Configuration ✅ (Now handles preflight requests)
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"], // ✅ Ensures CORS works correctly
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

// Routes
app.use("/api", cookieRoutes);
app.use("/api/auth", authRoutes);

// ✅ Fixed: Route now matches frontend request (/api/save)
app.post("/api/save", async (req, res) => {
  try {
    let { consentId, preferences } = req.body;

    // Validate request body
    if (!preferences) {
      return res.status(400).json({ error: "Missing preferences" });
    }

    // ✅ Generate a new consentId if not provided
    if (!consentId) {
      consentId = crypto.randomBytes(6).toString("hex"); // Generate unique ID
      console.log("🆕 Generated new consentId:", consentId);
    }

    // ✅ Check if user exists, create if not
    let user = await User.findOne({ consentId });

    if (!user) {
      console.warn("⚠️ Consent ID not found, creating new user:", consentId);
      user = new User({ consentId });
      await user.save();
    }

    // ✅ Check if preferences already exist for this consentId
    let existingPreferences = await CookiePreferences.findOne({ consentId });

    if (existingPreferences) {
      existingPreferences.preferences = preferences;
      await existingPreferences.save();
      return res.status(200).json({ message: "✅ Cookie preferences updated successfully", consentId });
    }

    // ✅ Create new cookie preferences
    const newPreferences = new CookiePreferences({ consentId, preferences });
    await newPreferences.save();

    res.status(201).json({ message: "✅ Cookie preferences saved successfully", consentId });
  } catch (error) {
    console.error("❌ Error saving cookie preferences:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Fixed: IP address handling improved
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";

    // Convert IPv6-mapped IPv4 addresses (e.g., "::ffff:192.168.1.1") to IPv4
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    // Handle localhost case
    if (clientIp === "::1") {
      clientIp = "127.0.0.1";
    }

    console.log("📌 Detected Client IP:", clientIp);

    // Fetch geolocation data
    const response = await axios.get(`http://ip-api.com/json/${clientIp}`);
    res.json({
      ip: clientIp,
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

// Start the server after DB connection ✅
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
