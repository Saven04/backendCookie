const express = require("express");
const axios = require("axios"); // For API requests
const router = express.Router();
const CookiePreference = require("../models/cookiePreference"); // Preferences Model
const LocationData = require("../models/locationData"); // Location Model
const User = require("../models/user"); // User Model

const IPINFO_TOKEN = "your_ipinfo_api_token"; // Replace with your actual IPInfo token

// GET User Preferences & Update Location
router.get("/getPreferences", async (req, res) => {
    try {
        const { consentId } = req.query;
        const userIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress; // Get user's IP

        if (!consentId) {
            return res.status(400).json({ success: false, message: "Consent ID is required" });
        }

        // Fetch user details
        const user = await User.findOne({ consentId });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Fetch cookie preferences
        const cookiePreferences = await CookiePreference.findOne({ consentId });

        if (!cookiePreferences) {
            return res.status(404).json({ success: false, message: "Preferences not found" });
        }

        // Fetch user's location from ipinfo.io
        let locationData;
        try {
            const response = await axios.get(`https://ipinfo.io/${userIp}/json?token=${IPINFO_TOKEN}`);
            locationData = response.data;
        } catch (err) {
            console.error("❌ Error fetching location data from ipinfo.io:", err.message);
            locationData = {}; // Default empty object if API fails
        }

        // Check if the user's location is different from the last recorded one
        const existingLocation = await LocationData.findOne({ consentId });

        if (!existingLocation || existingLocation.ip !== userIp) {
            // Update or create new location entry
            await LocationData.findOneAndUpdate(
                { consentId },
                {
                    ip: userIp,
                    country: locationData.country || "Unknown",
                    city: locationData.city || "Unknown",
                    region: locationData.region || "Unknown",
                    updatedAt: new Date(),
                },
                { upsert: true, new: true }
            );
        }

        res.json({
            success: true,
            preferences: cookiePreferences.preferences,
            location: {
                ip: userIp,
                country: locationData.country || "Unknown",
                city: locationData.city || "Unknown",
                region: locationData.region || "Unknown",
            },
        });
    } catch (error) {
        console.error("❌ Error fetching preferences:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;
