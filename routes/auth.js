const express = require("express");
const bcrypt = require("bcryptjs"); 
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Added import
const User = require("../models/user"); // Case-sensitive, matches User.js
const CookiePreferences = require("../models/cookiePreference"); // Standardized
const Location = require("../models/locationData"); // Standardized
const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json());

// POST /register - Register a new user
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, consentId } = req.body;

        // Validate inputs
        if (!username || !email || !password || !consentId) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // Hash email to check for existing user (matches schema's set: hashEmail)
        const hashedEmail = crypto.createHash("sha256").update(email).digest("hex");
        const existingUser = await User.findOne({ email: hashedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Check if at least one preference is chosen
        const cookiePreferences = await CookiePreferences.findOne({ consentId });
        const locationData = await Location.findOne({ consentId });

        if (!cookiePreferences && !locationData) {
            return res.status(400).json({ message: "You must select at least one preference before registering." });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user and link the consentId
        const newUser = new User({
            username,
            email, // Will be hashed by schema's set: hashEmail
            password: hashedPassword,
            consentId // Store the provided consentId
        });

        await newUser.save();

        // Generate JWT with raw email for MFA
        const token = jwt.sign(
            { userId: newUser._id, rawEmail: email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: "User registered successfully!",
            token,
            consentId: newUser.consentId
        });
    } catch (error) {
        console.error("Error:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// POST /login - Authenticate a user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const hashedEmail = crypto.createHash("sha256").update(email).digest("hex");
        const user = await User.findOne({ email: hashedEmail });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const cookiePreferences = await CookiePreferences.findOne({ consentId: user.consentId });
        const locationData = await Location.findOne({ consentId: user.consentId });

        if (!cookiePreferences && !locationData) {
            return res.status(403).json({ 
                message: "Access denied. You must select at least one preference before logging in." 
            });
        }

        const token = jwt.sign(
            { userId: user._id, rawEmail: email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            consentId: user.consentId,
            cookiePreferences: cookiePreferences || {},
            cookiesAccepted: true
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;