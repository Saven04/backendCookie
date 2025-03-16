const express = require("express");
const router = express.Router();

// Logout Route
router.post("/logout", async (req, res) => {
    try {
        // Extract token from Authorization header (Bearer <token>)
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(400).json({ message: "No token provided" });
        }

        // Optional: Add token to a blacklist if you implement server-side token invalidation
        // For example, store in a Redis blacklist or database:
        // await blacklistToken(token);

        // Return success response
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", {
            message: error.message,
            stack: error.stack,
            headers: req.headers,
        });
        res.status(500).json({ message: "Server error during logout" });
    }
});

// Optional: Function to blacklist token (uncomment and implement if needed)
// async function blacklistToken(token) {
//     const blacklist = require("../models/Blacklist"); // Hypothetical model
//     await blacklist.create({ token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }); // 1 hour expiry
// }

module.exports = router;