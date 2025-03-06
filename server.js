const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db"); // Ensure this function connects to MongoDB
const cors = require("cors");
const bodyParser = require("body-parser"); // Import body-parser
const cookieRoutes = require("./routes/cookieRoutes"); // Ensure this file and its routes are properly set up

const app = express();

// Middleware
app.use(bodyParser.json());  // Now it is correctly applied after app is initialized
app.use(cors({ origin: 'http://127.0.0.1:5500' })); // Allows requests from your frontend

// Connect to MongoDB
connectDB()
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // Exit the process if the database connection fails
  });

// Routes
app.use("/api", cookieRoutes); // Mount cookieRoutes at /api


app.post("/api/save", (req, res) => {
    try {
        // Your code here
    } catch (error) {
        console.error(error);  // This will help you identify what's going wrong
        res.status(500).send("Internal Server Error");
    }
});

// Health check route (optional for debugging)
app.get("/", (req, res) => {
  res.status(200).send("Server is running and healthy.");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
