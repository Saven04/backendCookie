require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip");
const axios = require("axios"); // ✅ Require axios

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Capture client IP

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

// ✅ Route to get real client IPv4
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = req.headers["x-forwarded-for"] || requestIp.getClientIp(req) || "Unknown";

    // Handle IPv6-mapped IPv4 addresses (e.g., "::ffff:192.168.1.1")
    if (clientIp.includes(",")) {
      clientIp = clientIp.split(",")[0].trim(); // Get first IP if multiple are present
    }
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);

    // Validate IPv4 format
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(clientIp)) {
      return res.status(400).json({ error: "Invalid IPv4 address detected", ip: clientIp });
    }

    // Fetch IP location data
    const ipInfoUrl = `https://ipinfo.io/${clientIp}/json?token=${process.env.IPINFO_TOKEN}`;
    const response = await axios.get(ipInfoUrl);

    if (!response.data) {
      return res.status(500).json({ error: "Failed to fetch IP info" });
    }

    res.json({
      ip: clientIp,
      city: response.data.city || "Unknown",
      region: response.data.region || "Unknown",
      country: response.data.country || "Unknown",
      org: response.data.org || "Unknown",
    });

  } catch (error) {
    console.error("❌ Error fetching IP info:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
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
