const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

router.use(express.json());

// POST /register - Register a new user
router.post("/register", async (req, res) => {
    try {
        console.log("📩 Incoming request data:", req.body); // Debugging log

        let { username, email, password, consentId } = req.body;

        // Trim inputs to prevent accidental spaces
        username = username?.trim();
        email = email?.trim();
        password = password?.trim();

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Username, email, and password are required!" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format!" });
        }

        // Generate Consent ID if not provided
        if (!consentId) {
            console.log("⚠️ No Consent ID provided. Generating new Consent ID...");
            consentId = crypto.randomUUID();
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already in use!" });
        }

        // Hash the password securely
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save the new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            consentId,
        });

        await newUser.save();
        console.log("✅ User registered successfully:", email);

        res.status(201).json({ message: "User registered successfully!", consentId });

    } catch (error) {
        console.error("❌ Error in /register:", error);
        res.status(500).json({ message: "Internal Server Error. Please try again later." });
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

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({
            message: "Login successful!",
            token,
            consentId: user.consentId // Send the stored Consent ID to the frontend
        });
    } catch (error) {
        console.error("❌ Error in /login:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// Middleware to verify JWT token
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden: Invalid token" });
        }
        req.userId = decoded.userId;
        next();
    });
};

// GET /check-auth - Verify authentication status
router.get("/check-auth", authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(401).json({ authenticated: false });
        }

        res.status(200).json({ authenticated: true, consentId: user.consentId });
    } catch (error) {
        console.error("❌ Error in /check-auth:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
