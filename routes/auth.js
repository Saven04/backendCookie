const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user"); 
const jwt = require("jsonwebtoken");
const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET || "5d36bf58f0cc3c17a4e8e177d23d11f1890aa00739f15af79999dc2a6a4bc23ed3ce6991f8ebe37fa81158cc79d63f8451627ac7912d985736dd1a4801654da7";
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

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user and link the consentId
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            consentId, // Link the short consentId provided by the frontend
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
        const { userInput, password } = req.body;

        // Ensure input exists
        if (!userInput || !password) {
            return res.status(400).json({ message: "Username or Email and Password are required." });
        }

        // Determine if userInput is an email or a username
        const isEmail = userInput.includes("@");

        // Find user by email or username
        const user = await User.findOne(isEmail ? { email: userInput } : { username: userInput });

        if (!user) {
            return res.status(400).json({ message: "Invalid username or email." });
        }

        // Validate password
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
            },
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// GET /check-auth - Check if the user is authenticated

// Middleware to check authentication status
router.get("/check-auth", (req, res) => {
    try {
        // Check if the session contains a userId
        if (req.session && req.session.userId) {
            return res.status(200).json({ authenticated: true });
        } else {
            return res.status(200).json({ authenticated: false });
        }
    } catch (error) {
        console.error("❌ Error in /check-auth:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
