const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Adjust path if needed

router.get("/api/get-consent-id", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user || !user.consentId) {
            return res.status(404).json({ error: "Consent ID not found" });
        }

        res.json({ consentId: user.consentId });

    } catch (error) {
        console.error("Error fetching Consent ID:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
