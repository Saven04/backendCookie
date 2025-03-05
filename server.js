require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Get real client IP
const axios = require("axios");
const session = require("express-session"); // Add session support
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const newsRoutes = require("./routes/newsRoutes");
const Consent = require("./models/consent"); 

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
app.use("/api/news", newsRoutes);

// ✅ Get Preferences by Consent ID
app.get("/api/getPreferences", async (req, res) => {
  try {
    const { consentId } = req.query;

    if (!consentId) {
      return res.status(400).json({ error: "❌ Missing consentId parameter." });
    }

    const consent = await Consent.findOne({ consentId });

    if (!consent) {
      return res.status(404).json({ error: "❌ Consent preferences not found." });
    }

    res.json({ preferences: consent.preferences });
  } catch (error) {
    console.error("❌ Error fetching preferences:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
});

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

// ✅ User Login Route
app.post("/api/login", async (req, res) => {
  try {
    console.log("Received login request:", req.body); // Debug log

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "❌ Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "❌ Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret", { expiresIn: "1h" });
    return res.json({ token, user });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "❌ Internal server error" });
  }
});

// ✅ Health check route
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
