const express = require("express");
const router = express.Router();
const Location = require("../models/locationData"); 

router.post("/location", async (req, res) => {
    try {
        const { consentId, ipAddress, country, region, purpose, consentStatus, ipProvider } = req.body;

        if (!consentId || !ipAddress || !country || !purpose || !consentStatus) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const locationData = {
            consentId,
            ipAddress,
            country,
            region: region || null,
            ipProvider: ipProvider || "unknown", // Fallback to unknown if not provided
            purpose,
            consentStatus,
            createdAt: new Date()
        };

        await Location.findOneAndUpdate(
            { consentId },
            locationData,
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Location data saved successfully" });
    } catch (error) {
        console.error("Error saving location data:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;