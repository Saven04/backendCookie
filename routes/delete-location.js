const express = require("express");
const router = express.Router();
const Location = require("../models/locationData");
const SecurityLog = require("../models/SecurityLog");

router.delete("/delete-location", async (req, res) => {
    try {
        const { consentId } = req.body;
        const token = req.headers.authorization?.split(" ")[1];
        if (!token || !consentId) {
            return res.status(400).json({ message: "Token and consentId required" });
        }

        // Delete location data
        const locationResult = await Location.deleteMany({ consentId });
        console.log(`Deleted ${locationResult.deletedCount} location records`);

        // Option 1: Nullify consentId in security logs (retain for security)
        const securityUpdateResult = await SecurityLog.updateMany(
            { consentId },
            { $set: { consentId: null } }
        );
        console.log(`Anonymized ${securityUpdateResult.modifiedCount} security logs`);

  
        res.status(200).json({
            message: "Location data deleted successfully",
            locationDeletedCount: locationResult.deletedCount,
            securityModifiedCount: securityUpdateResult.modifiedCount
            // securityDeletedCount: securityDeleteResult.deletedCount // For Option 2
        });
    } catch (error) {
        console.error("Delete location error:", error);
        res.status(500).json({ message: "Server error during location data deletion" });
    }
});

module.exports = router;