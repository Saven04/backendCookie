require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Capture real client IP
const axios = require("axios");
const helmet = require("helmet"); // ✅ Security middleware

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");

const app = express();

// ✅ Security Middleware
app.use(helmet()); // Adds HTTP security headers

// ✅ Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // Capture client IP

// ✅ CORS Configuration
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ✅ Connect to MongoDB with Auto-Reconnect
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout if cannot connect
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      autoIndex: false, // Disable auto-indexing for performance
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    setTimeout(connectDB, 5000); // Retry connection every 5 seconds
  }
};
connectDB();

// ✅ Routes
app.use("/api", cookieRoutes);
app.use("/api/auth", authRoutes);

// ✅ Get Client IP and Geolocation Data
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";

    // Extract IPv4 from `x-forwarded-for` if behind proxy
    if (req.headers["x-forwarded-for"]) {
      clientIp = req.headers["x-forwarded-for"].split(",")[0].trim();
    }

    // Convert IPv6-mapped IPv4 addresses (e.g., "::ffff:192.168.1.1") to IPv4
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);

    // Fetch geolocation data from `ip-api.com`
    const response = await axios.get(`http://ip-api.com/json/${clientIp}`);

    res.json({
      ip: clientIp, // ✅ Correctly formatted IPv4 address
      city: response.data.city || "Unknown",
      region: response.data.regionName || "Unknown",
      country: response.data.country || "Unknown",
      isp: response.data.isp || "Unknown",
    });

  } catch (error) {
    console.error("❌ Error fetching IP info:", error.message);
    res.status(500).json({ error: "Failed to retrieve IP information." });
  }
});

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running on Render and healthy." });
});

// ✅ Centralized Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal Server Error." });
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
