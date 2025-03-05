require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Middleware to capture client IP
const session = require("express-session"); // Add session support

// Import Routes
const cookieRoutes = require("./routes/consentRoutes");
const authRoutes = require("./routes/auth");
const newsRoutes = require("./routes/newsRoutes");
const locationRoutes = require("./routes/locationRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

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

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret", // Use a strong secret key
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
app.use("/api", authRoutes); // Authentication routes
app.use("/api/news", newsRoutes); // News-related routes
app.use("/api", locationRoutes); // Location-related routes

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running on Render and healthy." });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: "❌ Route not found." });
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});