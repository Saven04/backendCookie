const express = require("express");
const router = express.Router();
const Location = require("../models/locationData");
const { saveLocationData } = require("../controllers/locationController");

router.post("/location", async (req, res) => {
    try {
        const { consentId, ipAddress, isp, city, country, purpose, consentStatus } = req.body;

        // Validate required fields
        if (!consentId || !ipAddress || !isp || !city || !country || !purpose || !consentStatus) {
            return res.status(400).json({ 
                message: "Missing required fields: consentId, ipAddress, isp, city, country, purpose, and consentStatus are required." 
            });
        }

        // Validate data types
        if ([consentId, ipAddress, isp, city, country, purpose, consentStatus].some(field => typeof field !== "string")) {
            return res.status(400).json({ 
                message: "consentId, ipAddress, isp, city, country, purpose, and consentStatus must be strings." 
            });
        }

        // Validate latitude and longitude (if provided)
            // In routes/locationRoutes.js
     
        // Validate IP address format
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ipAddress)) {
            return res.status(400).json({ message: "Invalid IP address format." });
        }

        // Validate purpose and consentStatus enums
        const validPurposes = ["gdpr-jurisdiction", "consent-logging", "security"];
        const validConsentStatuses = ["accepted", "rejected", "not-applicable"];
        if (!validPurposes.includes(purpose)) {
            return res.status(400).json({ message: `Purpose must be one of: ${validPurposes.join(", ")}.` });
        }
        if (!validConsentStatuses.includes(consentStatus)) {
            return res.status(400).json({ message: `Consent status must be one of: ${validConsentStatuses.join(", ")}.` });
        }

        // Save location data via controller
        await saveLocationData({ 
            consentId, 
            ipAddress, 
            isp, 
            city, 
            country, 
            purpose, 
            consentStatus 
        });

        res.status(200).json({ message: "Location data saved successfully." });
    } catch (error) {
        console.error("Error saving location data:", error);
        res.status(500).json({
            message: "Failed to save location data.",
            error: error.message || "Unknown error",
        });
    }
});

// New DELETE route for soft deletion
router.delete("/location/:consentId", async (req, res) => {
    try {
        const { consentId } = req.params;

        if (!consentId) {
            return res.status(400).json({ message: "Consent ID is required." });
        }

        const locationDoc = await Location.findOne({ consentId, deletedAt: null });
        if (!locationDoc) {
            return res.status(404).json({ message: "Location data not found or already deleted." });
        }

        await locationDoc.softDelete();

        res.status(200).json({ message: "Location data soft-deleted successfully." });
    } catch (error) {
        console.error("Error soft-deleting location data:", error);
        res.status(500).json({
            message: "Failed to soft-delete location data.",
            error: error.message || "Unknown error",
        });
    }
});

module.exports = router;