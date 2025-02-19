const express = require("express");
const crypto = require("crypto");
const { 
    saveCookiePreferences, 
    deleteCookiePreferences 
} = require("../controllers/cookieController");
const { 
    saveLocationData, 
    deleteLocationData 
} = require("../controllers/locationController");
const connectDB = require("../db"); // ✅ Ensure MongoDB connection
const User = require("../models/User"); // ✅ Import Mongoose User model

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON

// ✅ Connect to MongoDB when the server starts
connectDB();

// ✅ Generate a short consent ID (only if necessary)
const generateShortId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(6);
    return bytes.toString("base64").replace(/[+/=]/g, "").slice(0, 8);
};

// 👉 **POST Route to Save Cookie Preferences**
router.post("/save", async (req, res) => {
    try {
        console.log("📩 Received request body:", req.body);

        let { consentId, preferences } = req.body;

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

        // ✅ If consentId is not provided, generate a new one
        if (!consentId) {
            consentId = generateShortId();
            console.log("⚠️ No consentId provided. Generated new one:", consentId);
        } else {
            // ✅ Check if consentId exists in MongoDB (Mongoose)
            const existingUser = await User.findOne({ consentId });

            if (!existingUser) {
                console.error("❌ Consent ID not found in database:", consentId);
                return res.status(404).json({ message: "Consent ID not found in database." });
            }
        }

        // ✅ Save preferences using Mongoose model
        await saveCookiePreferences(consentId, preferences);

        console.log("✅ Cookie preferences saved successfully for consentId:", consentId);

        res.status(200).json({ 
            message: "Cookie preferences saved successfully.",
            consentId
        });

    } catch (error) {
        console.error("❌ Error saving cookie preferences:", error);
        res.status(500).json({
            message: "Failed to save cookie preferences.",
            error: error.message || "Unknown error",
        });
    }
});

// 👉 **POST Route to Save Location Data**
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

        // ✅ Save location data
        await saveLocationData({ consentId, ipAddress, isp, city, country, latitude, longitude });

        res.status(200).json({ message: "Location data saved successfully." });
    } catch (error) {
        console.error("❌ Error saving location data:", error);
        res.status(500).json({
            message: "Failed to save location data.",
            error: error.message || "Unknown error",
        });
    }
});

// 👉 **DELETE Route to Delete User Data (Auto & Manual Deletion)**
router.delete("/delete-my-data/:consentId", async (req, res) => {
    try {
        const { consentId } = req.params;

        if (!consentId) {
            return res.status(400).json({ error: "Consent ID is required" });
        }

        // ✅ Delete user's stored data in parallel
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
