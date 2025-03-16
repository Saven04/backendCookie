const express = require("express");
const router = express.Router();
const Location = require("../models/locationData"); 
const { saveLocationData } = require("../controllers/locationController");

router.post("/location", async (req, res) => {
    try {
        let { consentId, ipAddress, isp, city, country, latitude, longitude } = req.body;

        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID." });
        }

        // Validate required fields
        if (!ipAddress || !isp || !city || !country) {
            return res.status(400).json({ message: "IP address, ISP, city, and country are required." });
        }

        // Validate data types
        if ([ipAddress, isp, city, country].some(field => typeof field !== "string")) {
            return res.status(400).json({ message: "IP address, ISP, city, and country must be strings." });
        }

        // Validate latitude and longitude (if provided)
        if (latitude !== undefined && (typeof latitude !== "number" || isNaN(latitude))) {
            return res.status(400).json({ message: "Latitude must be a valid number." });
        }

        if (longitude !== undefined && (typeof longitude !== "number" || isNaN(longitude))) {
            return res.status(400).json({ message: "Longitude must be a valid number." });
        }

        // Validate IP address format
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ipAddress)) {
            return res.status(400).json({ message: "Invalid IP address format." });
        }

        // Save location data
        await saveLocationData({ consentId, ipAddress, isp, city, country, latitude, longitude });

        res.status(200).json({ message: "Location data saved successfully." });
    } catch (error) {
        console.error("Error saving location data:", error);
        res.status(500).json({
            message: "Failed to save location data.",
            error: error.message || "Unknown error",
        });
    }
});


module.exports = router;