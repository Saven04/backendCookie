const express = require("express");
const CookiePreferences = require("../models/cookiePreferenceModel");
const Location = require("../models/locationDataModel");

const router = express.Router();

/**
 * 📝 UPDATE COOKIE PREFERENCES
 * Endpoint: PUT /api/consent/cookies
 */
router.put("/cookies", async (req, res) => {
    const { consentId, preferences } = req.body;

    if (!consentId || !preferences) {
        return res.status(400).json({ error: "Consent ID and preferences are required." });
    }

    try {
        const updatedPreferences = await CookiePreferences.findOneAndUpdate(
            { consentId },
            { preferences },
            { new: true, runValidators: true }
        );

        if (!updatedPreferences) {
            return res.status(404).json({ error: "Consent ID not found." });
        }

        res.json({ message: "Cookie preferences updated successfully.", data: updatedPreferences });
    } catch (error) {
        res.status(500).json({ error: "Failed to update preferences." });
    }
});

/**
 * 📝 UPDATE LOCATION DATA
 * Endpoint: PUT /api/consent/location
 */
router.put("/location", async (req, res) => {
    const { consentId, location } = req.body;

    if (!consentId || !location) {
        return res.status(400).json({ error: "Consent ID and location data are required." });
    }

    try {
        const updatedLocation = await Location.findOneAndUpdate(
            { consentId },
            location,
            { new: true, runValidators: true }
        );

        if (!updatedLocation) {
            return res.status(404).json({ error: "Location data not found for this Consent ID." });
        }

        res.json({ message: "Location data updated successfully.", data: updatedLocation });
    } catch (error) {
        res.status(500).json({ error: "Failed to update location data." });
    }
});

module.exports = router;
