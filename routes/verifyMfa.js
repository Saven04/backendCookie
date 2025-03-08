// routes/verifyMfa.js
const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/cookiePreference");
const Location = require("../models/locationData");
const authMiddleware = require("../middleware/authMiddleware");

let mfaCodes;

router.post("/", authMiddleware, async (req, res) => {
    const { code } = req.body;
    const user = req.user;

    // Ensure user is authenticated
    if (!user || !user._id) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    // Validate MFA code format
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        return res.status(400).json({ message: "Invalid code format: Must be a 6-digit number" });
    }

    // Retrieve stored MFA data
    const storedData = mfaCodes.get(user._id.toString());
    if (!storedData || storedData.code !== code || Date.now() > storedData.expires) {
        return res.status(400).json({ message: "Invalid or expired MFA code" });
    }

    const consentId = storedData.consentId;
    if (!consentId) {
        return res.status(400).json({ message: "Consent ID not found in stored data" });
    }

    try {
        const deletedAt = new Date();

        // Update CookiePreferences: Reset non-essential preferences, set deletedAt
        const cookieUpdateResult = await CookiePreferences.updateOne(
            { consentId: consentId },
            {
                $set: {
                    "preferences.performance": false,
                    "preferences.functional": false,
                    "preferences.advertising": false,
                    "preferences.socialMedia": false,
                    deletedAt: deletedAt
                }
            }
        );

        if (cookieUpdateResult.nModified === 0 && cookieUpdateResult.matchedCount === 0) {
            console.warn(`No CookiePreferences found for consentId: ${consentId}`);
        }

        // Update Location: Set deletedAt for soft delete
        const locationUpdateResult = await Location.updateOne(
            { consentId: consentId },
            {
                $set: { deletedAt: deletedAt }
            }
        );

        if (locationUpdateResult.nModified === 0 && locationUpdateResult.matchedCount === 0) {
            console.warn(`No Location data found for consentId: ${consentId}`);
        }

        // Clear the MFA code from the Map
        mfaCodes.delete(user._id.toString());

        res.status(200).json({ message: "Data deleted successfully" });
    } catch (error) {
        console.error("Error deleting data:", {
            message: error.message,
            stack: error.stack,
            consentId: consentId
        });
        res.status(500).json({ message: "Failed to delete data due to server error" });
    }
});

module.exports = (codes) => {
    mfaCodes = codes; // Initialize the mfaCodes Map
    return router;
};