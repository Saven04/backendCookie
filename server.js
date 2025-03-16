require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Get real client IP
const axios = require("axios");
const path = require('path');
const session = require("express-session"); // Add session support
const cookieRoutes = require("./routes/cookieRoutes");
const logoutRoutes = require("./routes/logoutRoutes");
const locationRoutes = require("./routes/locationRoutes");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware"); // Import middleware
const sendMfaRoute = require("./routes/sendMfa");
const deleteLocationRouter = require("./routes/delete-location");
const securityLogRouter = require("./routes/security-log");
const verifyMfaRoute = require("./routes/verifyMfa");
const newsRoutes = require("./routes/newsRoutes");
const profileRoutes = require('./routes/profile');
const app = express();



app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data if needed
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// CORS Configuration
const allowedOrigins = ["https://pluspointnews.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"], // Allow credentials headers
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

const mfaCodes = new Map();

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
app.use("/api", cookieRoutes);
app.use("/api", locationRoutes);  
app.use("/api", authRoutes); 
app.use("/api/send-mfa", authMiddleware, sendMfaRoute(mfaCodes));
app.use("/api/verify-mfa", authMiddleware, verifyMfaRoute(mfaCodes));
app.use('/api', profileRoutes);
app.use("/api", logoutRoutes);
app.use("/api", deleteLocationRouter);
app.use("/api", securityLogRouter);
app.use("/api/news", newsRoutes);

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
