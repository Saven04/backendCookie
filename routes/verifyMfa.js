// routes/verifyMfa.js
const express = require("express");
const router = express.Router();
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

    try {
        // Update user in database
        const deletedAt = new Date();

        // Delete non-essential cookie preferences, preserve consentId, and add deletedAt timestamp
        await User.updateOne(
            { _id: user._id },
            {
                $unset: { "cookiePreferences.nonEssential": "" }, // Remove nonEssential field
                $set: { "cookiePreferences.deletedAt": deletedAt } // Add timestamp, consentId unchanged
            }
        );

        // Update location data with deletedAt timestamp (soft delete), preserve consentId
        await User.updateOne(
            { _id: user._id },
            {
                $set: { "locationData.deletedAt": deletedAt } // Soft delete with timestamp
            }
        );

        // Clear the MFA code from the Map, but preserve consentId in storedData if needed elsewhere
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