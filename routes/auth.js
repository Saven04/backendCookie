const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user"); // MongoDB User model

const router = express.Router();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Extract token

    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    jwt.verify(token, process.env.JWT_SECRET || "default_secret_key", async (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token." });

        req.user = decoded; // Attach user data from token
        next();
    });
};

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
        console.error("Error during registration:", error);
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
            process.env.JWT_SECRET || "default_secret_key",
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                consentId: user.consentId,
            },
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// Get User Details Route
router.get("/user", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password"); // Exclude password
        if (!user) return res.status(404).json({ message: "User not found." });

        res.json(user);
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// Link Consent ID to User (NEW ENDPOINT)
router.post("/link-consent", async (req, res) => {
    try {
        const { userId, consentId } = req.body;

        if (!userId || !consentId) {
            return res.status(400).json({ error: "User ID and Consent ID are required" });
        }

        // Find user and update consent ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.consentId = consentId;
        await user.save();

        return res.status(200).json({ message: "Consent ID linked successfully" });
    } catch (error) {
        console.error("❌ Error linking consent ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
