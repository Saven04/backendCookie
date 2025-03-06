const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Adjust the path based on your project structure
const authenticateToken = require("../middleware/authMiddleware");

// ✅ Protected Route: Get user details
router.get("/", authenticateToken, async (req, res) => {
    try {
        // The user ID is extracted from the JWT payload
        const user = await User.findById(req.user.id).select("-password"); // Exclude password field

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
