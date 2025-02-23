const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // For generating UUIDs
const User = require("../models/user"); // MongoDB User model

const router = express.Router();
const SECRET_KEY = "32b3d47ef5ed82cb2e8202b0b29e37a18037a228133507f973a8fec946e03b8d"; // Replace with a secure secret key

// Register Route
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, consentId } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate a new consentId if not provided
        const finalConsentId = consentId || crypto.randomUUID();

        // Create new user with consentId
        const newUser = new User({ username, email, password: hashedPassword, consentId: finalConsentId });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully!", consentId: finalConsentId });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// Login Route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" } // Token expires in 1 hour
        );

        res.json({ message: "Login successful", token, user });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;
