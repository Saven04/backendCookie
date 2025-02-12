const express = require("express");
const { saveCookiePreferences, deleteCookiePreferences } = require("../controllers/cookieController");
const { saveLocationData } = require("../controllers/locationController");
const crypto = require("crypto");
const requestIp = require("request-ip");

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON
router.use(requestIp.mw()); // Auto-extract client IP

// ✅ Generate a short Consent ID (only if missing)
const generateShortId = () => {
    return crypto.randomBytes(6).toString("base64")
        .replace(/[+/=]/g, "")
        .slice(0, 8);
};

// ✅ POST Route to Save Cookie Preferences
router.post("/save", async (req, res) => {
    try {
        console.log("📩 Received request body:", req.body);

        let { consentId, preferences } = req.body;
        const ipAddress = requestIp.getClientIp(req); // Extract client IP

        // Ensure IP address is available
        if (!ipAddress) {
            return res.status(400).json({ message: "Unable to determine IP address." });
        }

        // Generate a consent ID if missing
        if (!consentId) {
            consentId = generateShortId();
        }

        // Validate Consent ID Format
        if (typeof consentId !== "string" || consentId.length < 5) {
            return res.status(400).json({ message: "Invalid Consent ID format." });
        }

        // Validate Preferences Object
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
        const result = await saveCookiePreferences(consentId, preferences);

        res.status(200).json({ 
            message: "Cookie preferences saved successfully.",
            consentId,
            result
        });
    } catch (error) {
        console.error("❌ Error saving cookie preferences:", error);
        res.status(500).json({
            message: "Failed to save cookie preferences.",
            error: error.message || "Unknown error",
        });
    }
});

// ✅ DELETE Route to Remove User Consent & Data
router.delete("/delete/:consentId", async (req, res) => {
    try {
        const { consentId } = req.params;

        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID." });
        }

        const result = await deleteCookiePreferences(consentId);

        res.status(200).json({ message: "Cookie preferences deleted successfully.", result });
    } catch (error) {
        console.error("❌ Error deleting cookie preferences:", error);
        res.status(500).json({ 
            message: "Failed to delete cookie preferences.", 
            error: error.message || "Unknown error" 
        });
    }
});





router.post("/location", async (req, res) => {
    try {
        let { consentId, isp, city, region, country, latitude, longitude, postalCode, timezone } = req.body;
        
        // Get the client's real IP
        const clientIp = requestIp.getClientIp(req) || req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID." });
        }

        if (!clientIp) {
            return res.status(400).json({ message: "Unable to determine IP address." });
        }

        console.log("✅ Real Client IP:", clientIp);

        // Validate required fields
        if (!isp || !city || !region || !country) {
            return res.status(400).json({ message: "ISP, city, region, and country are required." });
        }

        // Validate data types
        if ([isp, city, region, country, postalCode, timezone].some(field => field && typeof field !== "string")) {
            return res.status(400).json({ message: "ISP, city, region, country, postalCode, and timezone must be strings." });
        }

        // Validate latitude and longitude (if provided)
        if (latitude !== undefined && (typeof latitude !== "number" || isNaN(latitude))) {
            return res.status(400).json({ message: "Latitude must be a valid number." });
        }

        if (longitude !== undefined && (typeof longitude !== "number" || isNaN(longitude))) {
            return res.status(400).json({ message: "Longitude must be a valid number." });
        }

        // Save location data to MongoDB
        const result = await LocationData.create({
            consentId,
            ipAddress: clientIp,
            isp,
            city,
            region,
            country,
            latitude,
            longitude,
            postalCode,
            timezone
        });

        res.status(201).json({ message: "Location data saved successfully.", result });
    } catch (error) {
        console.error("❌ Error saving location data:", error);
        res.status(500).json({
            message: "Failed to save location data.",
            error: error.message || "Unknown error",
        });
    }
});


module.exports = router;
