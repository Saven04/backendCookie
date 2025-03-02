require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip");
const axios = require("axios");
const session = require("express-session");
const { createClient } = require("@supabase/supabase-js");

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const { getNextSequence } = require("./utils/counterHelper");
const Consent = require("./models/cookiePreference");

const app = express();
app.use(express.json());

// ✅ CORS Configuration
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// ✅ Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // Capture client IP

// ✅ Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
    },
  })
);

// ✅ Connect to MongoDB with Retry Mechanism
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
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
};
connectDB();

// ✅ Supabase Initialization
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ✅ Routes
app.use("/api", cookieRoutes);
app.use("/api", authRoutes);

// ✅ Request MFA OTP
app.post("/api/request-mfa", async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: "Email is required." });

    const { error } = await supabase.auth.signInWithOtp({ email: userEmail });
    if (error) return res.status(500).json({ error: "Failed to send OTP." });

    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("❌ Error sending MFA OTP:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Verify MFA OTP & Delete Data
app.post("/api/verify-mfa-and-delete-data", async (req, res) => {
  try {
    const { userEmail, otpCode } = req.body;
    if (!userEmail || !otpCode) return res.status(400).json({ error: "Email and OTP are required." });

    // Verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email: userEmail,
      token: otpCode,
      type: "email",
    });

    if (error) return res.status(401).json({ error: "Invalid or expired OTP." });

    // Delete user data after successful MFA verification
    await Consent.deleteMany({ user_email: userEmail });
    await mongoose.connection.db.collection("preferences").deleteMany({ user_email: userEmail });
    await mongoose.connection.db.collection("locationData").deleteMany({ user_email: userEmail });

    res.json({ success: true, message: "All user data deleted successfully." });
  } catch (error) {
    console.error("❌ Error verifying OTP or deleting data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Generate Consent ID (Ensuring Uniqueness)
app.post("/api/generate-consent-id", async (req, res) => {
  try {
    const { userId } = req.body; // Assuming userId is sent in request

    if (!userId) return res.status(400).json({ error: "User ID is required." });

    // Expire any existing consent for the user
    await Consent.updateMany({ user_id: userId, status: "active" }, { $set: { status: "expired" } });

    // Generate a new Consent ID
    const consentId = `CID-${await getNextSequence("consentId")}`;

    // Create new consent record
    const newConsent = new Consent({
      consent_id: consentId,
      user_id: userId,
      preferences: {},
      status: "active",
      created_at: new Date(),
    });

    await newConsent.save();
    res.json({ consentId });
  } catch (error) {
    console.error("❌ Error generating consentId:", error);
    res.status(500).json({ error: "Failed to generate consentId" });
  }
});

// ✅ Get Client IP & Geolocation
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);

    const response = await axios.get(`https://ipinfo.io/${clientIp}/json?token=10772b28291307`);
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

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running and healthy." });
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found." });
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
