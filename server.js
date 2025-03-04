require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip");
const axios = require("axios");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const newsRoutes = require("./routes/newsRoutes");
const consentRoutes = require("./routes/consentRoutes");
const User = require("./models/user"); // Import User model
const supabase = require("./config/supabaseClient"); // Supabase client setup
const { verifyMfa } = require("./utils/mfa"); // MFA verification function

const app = express();

// 🔹 Debug Supabase Import
if (!supabase) {
  console.error("❌ Supabase is not initialized!");
  process.exit(1);
} else {
  console.log("✅ Supabase initialized successfully.");
}

// ✅ Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(requestIp.mw()); // Capture client IP

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

// ✅ Session Configuration
if (!process.env.SESSION_SECRET) {
  console.error("❌ SESSION_SECRET is missing from .env file!");
  process.exit(1);
}
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Strong secret key
    resave: false,
    saveUninitialized: true,
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

// ✅ Routes
app.use("/api", cookieRoutes);
app.use("/api", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/consent", consentRoutes);

// ✅ Get Client IP & Geolocation Data
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
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.consentId) {
      return res.status(400).json({ message: "User consent ID is missing." });
    }

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

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running and healthy." });
});

// ✅ 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: "❌ Route not found." });
});

// ✅ Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
