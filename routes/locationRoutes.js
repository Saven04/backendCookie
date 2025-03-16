const express = require("express");
const router = express.Router();
const Location = require("../models/locationData"); 

router.post("/location", async (req, res) => {
    try {
        let { consentId, ipAddress, country, region, purpose, consentStatus } = req.body;

        // Validate required fields
        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID." });
        }
        if (!ipAddress || !country || !purpose || !consentStatus) {
            return res.status(400).json({ message: "IP address, country, purpose, and consent status are required." });
        }

        // Validate data types
        if ([consentId, ipAddress, country, purpose, consentStatus].some(field => typeof field !== "string")) {
            return res.status(400).json({ message: "Consent ID, IP address, country, purpose, and consent status must be strings." });
        }
        if (region && typeof region !== "string") {
            return res.status(400).json({ message: "Region must be a string if provided." });
        }

        // Validate IP address format
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ipAddress)) {
            return res.status(400).json({ message: "Invalid IP address format." });
        }

        // Validate purpose and consentStatus against schema enums
        const validPurposes = ["gdpr-jurisdiction", "consent-logging", "security"];
        if (!validPurposes.includes(purpose)) {
            return res.status(400).json({ message: "Invalid purpose. Must be one of: " + validPurposes.join(", ") });
        }
        const validConsentStatuses = ["accepted", "rejected", "not-applicable"];
        if (!validConsentStatuses.includes(consentStatus)) {
            return res.status(400).json({ message: "Invalid consent status. Must be one of: " + validConsentStatuses.join(", ") });
        }

        // Save location data to MongoDB
        const locationData = new Location({
            consentId,
            ipAddress, // Will be anonymized by schema setter if enabled
            country,
            region: region || null, // Optional field
            purpose,
            consentStatus
        });
        await locationData.save();

        res.status(200).json({ message: "Location data saved successfully for GDPR compliance." });
    } catch (error) {
        console.error("Error saving location data:", error);
        res.status(500).json({
            message: "Failed to save location data.",
            error: error.message || "Unknown error",
        });
    }
});

module.exports = router;