const express = require("express");
const { saveCookiePreferences } = require("../controllers/cookieController");
const { saveLocationData } = require("../controllers/locationController");
const crypto = require("crypto");
const requestIp = require("request-ip"); // ✅ Import request-ip

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON
router.use(requestIp.mw()); // ✅ Middleware to auto-extract client IP

// Generate a short consent ID (only if necessary)
const generateShortId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(6);
    return bytes.toString("base64")
                .replace(/[+/=]/g, "") 
                .slice(0, 8);
};

// 👉 **POST Route to Save Cookie Preferences**
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
        let { consentId, isp, city, country, latitude, longitude } = req.body;

        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID." });
        }

        // ✅ Get real user IP from request
        const clientIp = requestIp.getClientIp(req);
        console.log("✅ Real Client IP:", clientIp);

        // Validate required fields
        if (!isp || !city || !country) {
            return res.status(400).json({ message: "ISP, city, and country are required." });
        }

        // Validate data types
        if ([isp, city, country].some(field => typeof field !== "string")) {
            return res.status(400).json({ message: "ISP, city, and country must be strings." });
        }

        // Validate latitude and longitude (if provided)
        if (latitude !== undefined && (typeof latitude !== "number" || isNaN(latitude))) {
            return res.status(400).json({ message: "Latitude must be a valid number." });
        }

        if (longitude !== undefined && (typeof longitude !== "number" || isNaN(longitude))) {
            return res.status(400).json({ message: "Longitude must be a valid number." });
        }

        // Save location data
        await saveLocationData({ consentId, ipAddress: clientIp, isp, city, country, latitude, longitude });

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
