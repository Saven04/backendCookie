const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // For generating UUIDs
const User = require("../models/user"); // MongoDB User model

const router = express.Router();
const SECRET_KEY = "your_secret_key"; // Replace with a secure secret key

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
            return res.status(401).json({ message: "Invalid email or password!" });
        }

        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password!" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, username: user.username, consentId: user.consentId },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.json({ message: "Login successful!", token, consentId: user.consentId });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;
