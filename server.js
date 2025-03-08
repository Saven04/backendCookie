require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Get real client IP
const axios = require("axios");
const session = require("express-session"); // Add session support
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware"); // Import middleware
const sendMfaRoute = require("./routes/sendMfa");
const verifyMfaRoute = require("./routes/verifyMfa");
const newsRoutes = require("./routes/newsRoutes");
const app = express();



app.use(express.json());
// CORS Configuration
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"], // Allow credentials headers
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Use a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use `secure` cookies in production (HTTPS)
      httpOnly: true,
      sameSite: "strict",
    },
  })
);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "CookieDB",
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
connectDB();

// Routes
app.use("/api", cookieRoutes); // Cookie-related routes
app.use("/api", authRoutes); 
app.use("/api/send-mfa", authMiddleware, sendMfaRoute(mfaCodes));
app.use("/api/verify-mfa", authMiddleware, verifyMfaRoute(mfaCodes));
app.use("/api/news", newsRoutes);

// ✅ Route to get the real client IP and fetch geolocation data from `ip-api.com`
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";

    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);

    // Fetch geolocation data from `ip-api.com`
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

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: "❌ Route not found." });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
