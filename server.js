require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // Get real client IP
const path = require("path");
const session = require("express-session"); // Session support
const cookieRoutes = require("./routes/cookieRoutes");
const logoutRoutes = require("./routes/logoutRoutes");
const locationRoutes = require("./routes/locationRoutes");
const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware"); // User auth middleware
const sendMfaRoute = require("./routes/sendMfa");
const deleteLocationRouter = require("./routes/delete-location");
const securityLogRouter = require("./routes/security-log");
const verifyMfaRoute = require("./routes/verifyMfa");
const adminRoutes = require("./routes/AdminRoutes"); // Consistent casing
const newsRoutes = require("./routes/newsRoutes");

// Load models (optional, already required in routes)
require("./models/admin");
require("./models/auditlogs"); // Fixed typo from "auditlogs" to match adminRoutes.js

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(requestIp.mw()); // Capture client IP

// CORS Configuration
const allowedOrigins = [
    "https://pluspointnews.netlify.app",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    // Add your dashboard frontend URL, e.g., "https://gdpr-dashboard.netlify.app"
];
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);

// Session Configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || "your-default-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Debug Middleware to Log Requests
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.path}`);
    next();
});

// MongoDB Connection
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

// MFA Codes Map
const mfaCodes = new Map();

// Routes (Order matters: Admin routes first to avoid overlap)
app.use("/api/admin/", adminRoutes); // Isolated admin routes
app.use("/api", cookieRoutes); // More specific paths
app.use("/api", locationRoutes);
app.use("/api", authRoutes);
app.use("/api/send-mfa", authMiddleware, sendMfaRoute(mfaCodes));
app.use("/api/verify-mfa", authMiddleware, verifyMfaRoute(mfaCodes));
app.use("/api", logoutRoutes);
app.use("/api", deleteLocationRouter);
app.use("/api", securityLogRouter);
app.use("/api/news", newsRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// Health check route
app.get("/", (req, res) => {
    res.status(200).json({ message: "✅ Server is running on Render and healthy." });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ message: "❌ Route not found." });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("❌ Server error:", err.stack);
    res.status(500).json({
        message: "Something went wrong!",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});