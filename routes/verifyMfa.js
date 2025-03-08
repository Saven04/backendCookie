// routes/verifyMfa.js
const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/cookiePreference"); // Updated model name
const Location = require("../models/locationData"); // Updated model name
const authMiddleware = require("../middleware/authMiddleware");

let mfaCodes;

router.post("/", authMiddleware, async (req, res) => {
    const { code } = req.body;
    const user = req.user;

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        return res.status(400).json({ message: "Invalid code format" });
    }

    const storedData = mfaCodes.get(user._id.toString());
    if (!storedData || storedData.code !== code || Date.now() > storedData.expires) {
        return res.status(400).json({ message: "Invalid or expired code" });
    }

    const consentId = storedData.consentId; // Get consentId from mfaCodes
    if (!consentId) {
        return res.status(400).json({ message: "Consent ID not found" });
    }

    try {
        // Update records in database
        const deletedAt = new Date();

        // Update CookiePreferences: Reset non-essential preferences, add deletedAt, preserve consentId
        await CookiePreferences.updateOne(
            { consentId: consentId }, // Query by consentId
            {
                $set: {
                    "preferences.performance": false,
                    "preferences.functional": false,
                    "preferences.advertising": false,
                    "preferences.socialMedia": false,
                    deletedAt: deletedAt // Dynamically add deletedAt
                }
            }
        );

        // Update Location: Add deletedAt timestamp (soft delete)
        await Location.updateOne(
            { consentId: consentId }, // Query by consentId
            {
                $set: { deletedAt: deletedAt } // Dynamically add deletedAt
            }
        );

        // Clear the MFA code from the Map
        mfaCodes.delete(user._id.toString());

        res.status(200).json({ message: "Data deleted successfully" });
    } catch (error) {
        console.error("Error deleting data:", error);
        res.status(500).json({ message: "Failed to delete data" });
    }
});

module.exports = (codes) => {
    mfaCodes = codes; // Initialize the mfaCodes Map
    return router;
};