const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); // For generating UUIDs
const User = require("../models/user"); // MongoDB User model
const router = express.Router();

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

module.exports = router;
