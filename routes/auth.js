const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user"); 
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const router = express.Router();
router.use(express.json());

// JWT Secret Key (Ensure to set this in your environment variables)
const JWT_SECRET = process.env.JWT_SECRET || "your-secure-jwt-secret";

// **Generate Unique Consent ID (if not provided)**
const generateConsentId = () => `CID-${crypto.randomUUID().split('-')[0]}`;

// **POST /register - Register a new user**
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, consentId } = req.body;

        // Validate inputs
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // Check if the email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already in use!" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user with auto-generated consentId if not provided
        const newUser = new User({
            username,
            email: email.toLowerCase(), // Normalize email
            password: hashedPassword,
            consentId: consentId || generateConsentId(), // Assign unique consent ID if missing
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });

    } catch (error) {
        console.error("❌ Registration Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// **POST /login - Authenticate user**
router.post("/login", async (req, res) => {
    try {
        const { userInput, password } = req.body;

        if (!userInput || !password) {
            return res.status(400).json({ message: "Username/Email and Password are required." });
        }

        // Determine if userInput is an email or a username
        const isEmail = userInput.includes("@");
        const query = isEmail ? { email: userInput.toLowerCase() } : { username: userInput };

        // Find user
        const user = await User.findOne(query);
        if (!user) {
            return res.status(400).json({ message: "Invalid username or email." });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password." });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                consentId: user.consentId,
            },
        });

    } catch (error) {
        console.error("❌ Login Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// **GET /check-auth - Verify authentication status**
router.get("/check-auth", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

        if (!token) {
            return res.status(401).json({ authenticated: false, message: "No token provided." });
        }

        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ authenticated: false, message: "Invalid token." });
            }

            const user = await User.findById(decoded.userId).select("-password");
            if (!user) {
                return res.status(404).json({ authenticated: false, message: "User not found." });
            }

            res.status(200).json({ authenticated: true, user });
        });

    } catch (error) {
        console.error("❌ Auth Check Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
