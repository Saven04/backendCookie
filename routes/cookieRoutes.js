const express = require("express");
const { saveCookiePreferences, deleteCookiePreferences } = require("../controllers/cookieController");
const { saveLocationData, deleteLocationData } = require("../controllers/locationController");
const crypto = require("crypto");

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON

// Generate a short consent ID (only if necessary)
const generateShortId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(6);
    return bytes.toString("base64")
                .replace(/[+/=]/g, "") 
                .slice(0, 8);
};

// Updated POST Route to Save Cookie Preferences
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
        if (!requiredKeys.every(key => key in preferences)) {
            return res.status(400).json({ message: "One or more required preference keys are missing." });
        }

        // Save to database
        await saveCookiePreferences(consentId, preferences);

        // Return the same `consentId` to be used for location data
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

// Updated POST Route to Save Location Data
router.post("/location", async (req, res) => {
    try {
        const { consentId, ipAddress, isp, city, country, latitude, longitude } = req.body;

        if (!consentId) {
            return res.status(400).json({ message: "Missing consent ID." });
        }

        // Validate required fields
        if (!ipAddress || !isp || !city || !country) {
            return res.status(400).json({ message: "IP address, ISP, city, and country are required." });
        }

        // Validate data types
        if (typeof ipAddress !== "string" || typeof isp !== "string" || typeof city !== "string" || typeof country !== "string") {
            return res.status(400).json({ message: "IP address, ISP, city, and country must be strings." });
        }

        // Validate latitude and longitude (if provided)
        if (latitude !== undefined && (typeof latitude !== "number" || isNaN(latitude) || latitude < -90 || latitude > 90)) {
            return res.status(400).json({ message: "Latitude must be a valid number between -90 and 90." });
        }

        if (longitude !== undefined && (typeof longitude !== "number" || isNaN(longitude) || longitude < -180 || longitude > 180)) {
            return res.status(400).json({ message: "Longitude must be a valid number between -180 and 180." });
        }

        // Validate IP address format (simple check for IPv4)
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
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

// Route to Delete User Data (Auto & Manual Deletion)
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
