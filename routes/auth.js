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

        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Check if the user has chosen at least one preference
        const cookiePreferences = await CookiePreference.findOne({ consentId: user.consentId });
        const locationData = await LocationData.findOne({ consentId: user.consentId });

        if (!cookiePreferences && !locationData) {
            return res.status(403).json({ message: "Access denied. You must select at least one preference before logging in." });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ message: "Login successful!", token });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});



// Middleware to check authentication status
router.get("/check-auth", (req, res) => {
    try {
        // Get the token from request headers
        const token = req.headers.authorization?.split(" ")[1]; // Expected format: "Bearer <token>"

        if (!token) {
            return res.status(200).json({ authenticated: false });
        }

        // Verify the token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(200).json({ authenticated: false });
            }
            return res.status(200).json({ authenticated: true, userId: decoded.userId });
        });

    } catch (error) {
        console.error("❌ Error in /check-auth:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
