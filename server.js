require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Get real client IP
const axios = require("axios");
const session = require("express-session");
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const Consent = require("./models/counter"); 

const app = express();
app.use(express.json());

// CORS Configuration
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
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
app.use("/api", cookieRoutes);
app.use("/api", authRoutes);

// Generate short Consent ID (Production Ready)
app.post("/api/generate-consent-id", async (req, res) => {
  try {
    // Fetch the last stored consent count from MongoDB
    const lastConsent = await Consent.findOne().sort({ _id: -1 });

    // Generate a new Consent ID
    const lastCounter = lastConsent ? parseInt(lastConsent.consentId.split("-")[1]) : 0;
    const newCounter = lastCounter + 1;
    const consentId = `CID-${newCounter}`;

    res.json({ consentId });
  } catch (error) {
    console.error("❌ Error generating consentId:", error);
    res.status(500).json({ error: "Failed to generate consentId" });
  }
});

// ✅ Get real client IP & geolocation
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);
    
    // Use ipinfo.io API (Replace 'YOUR_ACCESS_TOKEN' with your actual token)
    const response = await axios.get(`https://ipinfo.io/${clientIp}/json?token=10772b28291307`);

    // Extract location data
    const { city, region, country, org } = response.data;

    res.json({
      ip: clientIp,
      city: city || "Unknown",
      region: region || "Unknown",
      country: country || "Unknown",
      isp: org || "Unknown",
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
