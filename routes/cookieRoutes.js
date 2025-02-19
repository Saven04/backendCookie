const express = require("express");
const crypto = require("crypto");
const { saveCookiePreferences } = require("../controllers/cookieController");
const { saveLocationData } = require("../controllers/locationController");
const User = require("../models/user"); // User model
const router = express.Router();

router.use(express.json()); // Middleware to parse JSON

// Generate a short consent ID for guest users
const generateShortId = () => {
    return crypto.randomBytes(6).toString("hex").slice(0, 12);
};

// Middleware to fetch consentId for logged-in users
const getUserConsentId = async (req) => {
    if (req.user) {
        // Fetch consentId from logged-in user's data
        const user = await User.findOne({ email: req.user.email });
        return user ? user.consentId : null;
    }
    return null;
};

// 👉 **Updated POST Route to Save Cookie Preferences**
router.post("/save", async (req, res) => {
    try {
        console.log("Received request body:", req.body);

        let { consentId, preferences } = req.body;

        // If user is logged in, fetch their consentId
        const userConsentId = await getUserConsentId(req);

        // Use user's consentId if available; otherwise, generate a new one
        consentId = userConsentId || consentId || generateShortId();

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
        let { consentId, ipAddress, isp, city, country, latitude, longitude } = req.body;

        // If user is logged in, fetch their consentId
        const userConsentId = await getUserConsentId(req);

        // Use user's consentId if available; otherwise, reject missing ID
        consentId = userConsentId || consentId;
        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID. Please log in or register." });
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

router.delete("/delete-my-data/:consentId", async (req, res) => {
    try {
        const { consentId } = req.params;

        if (!consentId) {
            return res.status(400).json({ error: "Consent ID is required" });
        }

        // Delete user's stored data in parallel
        const [cookieDeleteResult, locationDeleteResult] = await Promise.all([
            deleteCookiePreferences(consentId),
            deleteLocationData(consentId)
        ]);

        res.status(200).json({ 
            message: "Your data has been deleted successfully.",
            cookieDeleteResult,
            locationDeleteResult
        });

    } catch (error) {
        console.error("❌ Error deleting user data:", error);
        res.status(500).json({ error: "Failed to delete user data." });
    }
});

module.exports = router;
