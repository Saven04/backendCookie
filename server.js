require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // Middleware to get real client IP
const axios = require("axios");
const crypto = require("crypto");

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // Middleware to capture client IP

// CORS Configuration (Now handles preflight requests)
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"], // Ensures CORS works correctly
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

// This route is now handled by cookieRoutes, so comment out or remove it
// app.post("/api/save", async (req, res) => {
//   // ... (previous implementation)
// });

// Improved IP address handling
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

// Start the server after DB connection
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
