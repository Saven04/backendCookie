const express = require("express");
const router = express.Router();
const SecurityLog = require("../models/SecurityLog"); // Define this model

// Log IP and timestamp on login/register (call this in those routes)
router.post("/log-security", async (req, res) => {
    try {
        const { ipAddress } = req.body; // Pass from frontend or get from req.ip
        const token = req.headers.authorization?.split(" ")[1];
        if (!token || !ipAddress) {
            return res.status(400).json({ message: "Token and IP required" });
        }

        await SecurityLog.create({
            ipAddress,
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day retention
        });

        res.status(200).json({ message: "Security log recorded" });
    } catch (error) {
        console.error("Security log error:", error);
        res.status(500).json({ message: "Server error during security logging" });
    }
});

module.exports = router;