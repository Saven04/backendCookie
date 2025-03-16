const express = require("express");
const router = express.Router();

// Assuming a MongoDB model for location data; adjust for your DB
const Location = require("../models/locationData"); 

router.delete("/delete-location", async (req, res) => {
    try {
        const { consentId } = req.body;
        const token = req.headers.authorization?.split(" ")[1];
        if (!token || !consentId) {
            return res.status(400).json({ message: "Token and consentId required" });
        }

        const result = await Location.deleteMany({ consentId });
        res.status(200).json({
            message: "Location data deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Delete location error:", error);
        res.status(500).json({ message: "Server error during location data deletion" });
    }
});

module.exports = router;