const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db"); // Ensure this connects to MongoDB
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth"); // Import authentication routes

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "https://t10login.netlify.app/", credentials: true })); // CORS with credentials

// Connect to MongoDB
connectDB()
  .then(() => console.log("✅ Connected to MongoDB successfully"))
  .catch((err) => {
    console.error("❌ Error connecting to MongoDB:", err);
    process.exit(1);
  });

// Routes
app.use("/api", cookieRoutes); // Mount cookie-related routes
app.use("/api/auth", authRoutes); // Mount authentication routes

// Example API Endpoint (Modify as needed)
app.post("/api/save", async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || !value) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Your data-saving logic here...

    res.status(201).json({ message: "Data saved successfully" });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.status(200).send("✅ Server is running and healthy.");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
