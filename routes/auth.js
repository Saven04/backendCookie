const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Consent = require("../models/consent");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json());

// POST /register - Register a new user
// POST /register - Register a new user
// POST /register - Register a new user
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, preferences } = req.body;

        // Validate inputs
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Username, email, and password are required!" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        // Save default consent preferences if none are provided
        const defaultPreferences = preferences || {
            strictlyNecessary: true,
            performance: false,
            functional: false,
            advertising: false,
            socialMedia: false,
        };

        // Save consent preferences in the Consents collection
        const newConsent = new Consent({
            userId: newUser._id, // Link to the user's _id
            preferences: defaultPreferences, // Use provided preferences or defaults
        });

        await newConsent.save();

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

        // Find the user in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Return user data and token
        res.status(200).json({
            token,
            user: {
                userId: user._id, // Ensure this field exists
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

// GET /check-auth - Check if the user is authenticated
router.get("/check-auth", authenticateToken, (req, res) => {
    try {
        // If the middleware passes, the user is authenticated
        res.status(200).json({ authenticated: true });
    } catch (error) {
        console.error("❌ Error in /check-auth:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE /delete-data - Delete user data
router.delete("/delete-data", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Mark the user for deletion
        await User.findByIdAndUpdate(userId, { deletedAt: new Date() });

        // Delete user's consent preferences from the Consents collection
        await Consent.deleteMany({ userId });

        res.status(200).json({ message: "Your data has been marked for deletion as per GDPR." });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});
// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid or expired token." });
        req.user = user; // Attach the user object to the request
        next();
    });
}

module.exports = router;