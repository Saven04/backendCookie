require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios"); // ✅ Import axios for API requests

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(bodyParser.json());

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

// ✅ Fix: Ensure `/api/get-ipinfo` always returns JSON
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    const response = await axios.get("https://ipinfo.io/json");

    if (!response.data) {
      return res.status(500).json({ error: "Failed to fetch IP info" });
    }

    res.json(response.data); // ✅ Ensures JSON response
  } catch (error) {
    console.error("❌ Error fetching IP info:", error.message);
    res.status(500).json({ error: "Internal Server Error" }); // ✅ Prevents HTML responses
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
