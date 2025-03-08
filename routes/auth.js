const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user"); 
const CookiePreference = require("../models/cookiePreference");
const LocationData = require("../models/locationData");
const jwt = require("jsonwebtoken");
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

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Check if at least one preference is chosen
        const cookiePreferences = await CookiePreference.findOne({ consentId });
        const locationData = await LocationData.findOne({ consentId });

        if (!cookiePreferences && !locationData) {
            return res.status(400).json({ message: "You must select at least one preference before registering." });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user and link the consentId
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            consentId, // Store the short consentId
        });

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

        // Hash the email to match the stored hashed email in User schema
        const hashedEmail = require("crypto").createHash("sha256").update(email).digest("hex");

        // Find the user
        const user = await User.findOne({ email: hashedEmail });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Fetch cookie preferences and location data
        const cookiePreferences = await CookiePreference.findOne({ consentId: user.consentId });
        const locationData = await LocationData.findOne({ consentId: user.consentId });

        if (!cookiePreferences && !locationData) {
            return res.status(403).json({ 
                message: "Access denied. You must select at least one preference before logging in." 
            });
        }

        // Generate JWT token, including raw email for MFA
        const token = jwt.sign(
            { 
                userId: user._id, 
                rawEmail: email // Include raw email in payload for MFA
            }, 
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
