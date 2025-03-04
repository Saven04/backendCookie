require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip");
const axios = require("axios");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const newsRoutes = require("./routes/newsRoutes");
const consentRoutes = require("./routes/consentRoutes");
const User = require("./models/user");
const mfaRoutes = require("./routes/mfaRoutes");
const supabase = require("./config/supabaseClient");
const { verifyMfa } = require("./utils/mfa");

const app = express();

// ✅ Verify Supabase Initialization
if (!supabase) {
  console.error("❌ Supabase initialization failed!");
  process.exit(1);
}
console.log("✅ Supabase initialized successfully.");

// ✅ Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(requestIp.mw()); // Capture client IP

// ✅ Security Middleware
app.use(helmet()); // Secure headers
app.disable("x-powered-by"); // Hide tech details

// ✅ Rate Limiting (Prevents Abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

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

// ✅ Session Configuration (Prevents Session Fixation)
if (!process.env.SESSION_SECRET) {
  console.error("❌ SESSION_SECRET is missing from .env file!");
  process.exit(1);
}
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
    },
  })
);

// ✅ Connect to MongoDB
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing from .env file!");
  process.exit(1);
}
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



app.get("/api/get-consent-id", async (req, res) => {
  try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ email: decoded.email });

      if (!user || !user.consentId) {
          return res.status(404).json({ error: "Consent ID not found" });
      }

      res.json({ consentId: user.consentId });
  } catch (error) {
      console.error("Error fetching Consent ID:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// ✅ Routes
app.use("/api", cookieRoutes);
app.use("/api", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/mfa", mfaRoutes);


// ✅ Get Client IP & Geolocation Data (Privacy-Aware)
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";
    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }
    console.log("📌 Detected Client IP:", clientIp);

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

// ✅ Secure Login with Supabase MFA
app.post("/api/login", async (req, res) => {
  try {
    console.log("📩 Received login request:", req.body);
    const { email, password, mfaCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    if (!user.consentId) return res.status(400).json({ message: "User consent ID is missing." });

    // 🔹 Step 1: Verify MFA before issuing JWT
    const isMfaValid = await verifyMfa(user.consentId, mfaCode, "email");
    if (!isMfaValid) {
      return res.status(401).json({ message: "Invalid MFA code" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing from .env file!");
      process.exit(1);
    }

    // 🔹 Step 2: Generate Secure JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, user });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ Logout Route (Clears Session)
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Logout error:", err);
      return res.status(500).json({ error: "Failed to log out" });
    }
    res.clearCookie("connect.sid"); // Clear session cookie
    res.json({ message: "✅ Successfully logged out" });
  });
});

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running and healthy." });
});

// ✅ 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: "❌ Route not found." });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
