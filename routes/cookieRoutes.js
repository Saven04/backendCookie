const express = require("express");
const { saveCookiePreferences } = require("../controllers/cookieController");
const { saveLocationData } = require("../controllers/locationController");
const crypto = require("crypto");

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON

// Generate a short consent ID (only if necessary)
const generateShortId = () => {
    const bytes = crypto.randomBytes(6);
    return bytes.toString("base64")
                .replace(/[+/=]/g, "") 
                .slice(0, 8);
};

// 👉 **Updated POST Route to Save Cookie Preferences**
router.post("/save", async (req, res) => {
    try {
        console.log("Received request body:", req.body);

        let { consentId, preferences } = req.body;

        // If consentId is not provided, generate a new one
        if (!consentId) {
            consentId = generateShortId();
        }

        // Validate preferences
        if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
            return res.status(400).json({ message: "Invalid or missing preferences object." });
        }

        // Ensure required keys are present
        const requiredKeys = ["strictlyNecessary", "performance", "functional", "advertising", "socialMedia"];
        for (const key of requiredKeys) {
            if (!(key in preferences)) {
                return res.status(400).json({ message: `Missing required key: ${key}` });
            }
        }

        // Save to database
        await saveCookiePreferences(consentId, preferences);

        // ✅ **Return the same `consentId` to be used for location data**
        res.status(200).json({ 
            message: "Cookie preferences saved successfully.",
            consentId
        });

    } catch (error) {
        console.error("Error saving cookie preferences:", error);
        res.status(500).json({
            message: "Failed to save cookie preferences.",
            error: error.message || "Unknown error",
        });
    }
});

// 👉 **Updated POST Route to Save Location Data**
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
