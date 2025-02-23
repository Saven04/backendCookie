require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Correct way to get real client IP
const axios = require("axios");
const session = require("express-session"); // Add session support
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

// CORS Configuration
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies and sessions
  })
);

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use `secure` cookies in production (HTTPS)
      httpOnly: true, // Prevent client-side JavaScript access to cookies
      sameSite: "strict", // Prevent CSRF attacks
    },
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
app.use("/api", cookieRoutes); // Cookie-related routes
app.use("/api/auth", authRoutes); // Authentication routes

// ✅ Route to get the real client IP and fetch geolocation data from `ip-api.com`
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