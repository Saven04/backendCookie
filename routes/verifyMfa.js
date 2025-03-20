const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/cookiePreference");
const Location = require("../models/locationData");
const authMiddleware = require("../middleware/authMiddleware");

let mfaCodes;

router.post("/", authMiddleware, async (req, res) => {
    const { code } = req.body;
    const user = req.user;

    if (!user || !user._id) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        return res.status(400).json({ message: "Invalid code format: Must be a 6-digit number" });
    }

    const storedData = mfaCodes.get(user._id.toString());
    if (!storedData || storedData.code !== code || Date.now() > storedData.expires) {
        return res.status(400).json({ message: "Invalid or expired MFA code" });
    }

    const consentId = storedData.consentId;
    if (!consentId) {
        console.error("Consent ID missing in mfaCodes for user:", user._id);
        return res.status(400).json({ message: "Consent ID not found in stored data" });
    }

    try {
        const deletedAt = new Date();

        // Update CookiePreferences (soft delete by disabling optional preferences)
        const cookieUpdateResult = await CookiePreferences.updateOne(
            { consentId: consentId },
            {
                $set: {
                    "preferences.performance": false,
                    "preferences.functional": false,
                    "preferences.advertising": false,
                    "preferences.socialMedia": false,
                    deletedAt: deletedAt,
                    updatedAt: deletedAt // Align with timestamps
                }
            }
        );

        if (cookieUpdateResult.matchedCount === 0) {
            console.warn(`No CookiePreferences found for consentId: ${consentId}`);
        }

        // Soft delete Location data using the model's method
        let locationDoc = await Location.findOne({ consentId: consentId });
        if (locationDoc) {
            if (!locationDoc.deletedAt) {
                await locationDoc.softDelete(); // Uses model's softDelete method
            }
        } else {
            console.warn(`No Location data found for consentId: ${consentId}`);
        }

        // Clear the MFA code
        mfaCodes.delete(user._id.toString());

        res.status(200).json({ message: "Data soft-deleted successfully" });
    } catch (error) {
        console.error("Error soft-deleting data:", {
            message: error.message,
            stack: error.stack,
            consentId: consentId,
            userId: user._id
        });
        res.status(500).json({ message: "Failed to soft-delete data due to server error" });
    }
});

module.exports = (codes) => {
    mfaCodes = codes;
    return router;
};