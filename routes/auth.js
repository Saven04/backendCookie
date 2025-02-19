const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user"); // User model
const CookiePreferences = require("../models/cookiePreference"); // Cookie Preferences model
const router = express.Router();

// Function to generate a unique Consent ID
function generateConsentId() {
    return crypto.randomUUID(); // Generates a unique UUID
}

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Hash email to match stored format
        const hashedEmail = crypto.createHash("sha256").update(email).digest("hex");

        // Check if user already exists
        const existingUser = await User.findOne({ email: hashedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate Consent ID
        const consentId = generateConsentId();

        // Create new user with Consent ID
        const newUser = new User({ username, email, password: hashedPassword, consentId });
        await newUser.save();

        // Initialize Cookie Preferences with Consent ID
        const newCookiePreferences = new CookiePreferences({ consentId });
        await newCookiePreferences.save();

        res.status(201).json({ message: "User registered successfully!", consentId });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;
