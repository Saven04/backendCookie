const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user"); // MongoDB User model
const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json());

// POST /register - Register a new user
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// POST /login - Authenticate a user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Create a session for the user
        req.session.userId = user._id; // Store the user's ID in the session

        res.status(200).json({ message: "Login successful!", userId: user._id });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// GET /check-auth - Check if the user is authenticated

// Middleware to check authentication status
router.get("/check-auth", (req, res) => {
    try {
        // Check if the session contains a userId
        if (req.session && req.session.userId) {
            return res.status(200).json({ authenticated: true });
        } else {
            return res.status(200).json({ authenticated: false });
        }
    } catch (error) {
        console.error("❌ Error in /check-auth:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;

module.exports = router;