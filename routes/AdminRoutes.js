const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/cookiePreference");
const Location = require("../models/locationData");
const User = require("../models/user");

router.get("/gdpr-data", async (req, res) => {
    try {
        const data = await CookiePreferences.aggregate([
            {
                $lookup: {
                    from: "locations",
                    localField: "consentId",
                    foreignField: "consentId",
                    as: "location"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "consentId",
                    foreignField: "consentId",
                    as: "user"
                }
            },
            {
                $project: {
                    consentId: 1,
                    preferences: 1,
                    "timestamps.cookiePreferences": {
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt"
                    },
                    ipAddress: { $arrayElemAt: ["$location.ipAddress", 0] },
                    isp: { $arrayElemAt: ["$location.isp", 0] },
                    city: { $arrayElemAt: ["$location.city", 0] },
                    country: { $arrayElemAt: ["$location.country", 0] },
                    purpose: { $arrayElemAt: ["$location.purpose", 0] },
                    consentStatus: { $arrayElemAt: ["$location.consentStatus", 0] },
                    "timestamps.location": {
                        createdAt: { $arrayElemAt: ["$location.createdAt", 0] },
                        updatedAt: { $arrayElemAt: ["$location.updatedAt", 0] },
                        deletedAt: { $arrayElemAt: ["$location.deletedAt", 0] }
                    },
                    username: { $arrayElemAt: ["$user.username", 0] }
                }
            }
        ]);

        if (data.length === 0) {
            return res.json([]); // Return empty array if no data
        }

        res.json(data);
    } catch (error) {
        console.error("Error fetching GDPR data:", error);
        res.status(500).json({ error: "Failed to fetch GDPR data", details: error.message });
    }
});

router.get("/gdpr-data/:consentId", async (req, res) => {
    const { consentId } = req.params;
    try {
        const data = await CookiePreferences.aggregate([
            { $match: { consentId } },
            {
                $lookup: {
                    from: "locations",
                    localField: "consentId",
                    foreignField: "consentId",
                    as: "location"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "consentId",
                    foreignField: "consentId",
                    as: "user"
                }
            },
            {
                $project: {
                    consentId: 1,
                    preferences: 1,
                    "timestamps.cookiePreferences": {
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt"
                    },
                    ipAddress: { $arrayElemAt: ["$location.ipAddress", 0] },
                    isp: { $arrayElemAt: ["$location.isp", 0] },
                    city: { $arrayElemAt: ["$location.city", 0] },
                    country: { $arrayElemAt: ["$location.country", 0] },
                    purpose: { $arrayElemAt: ["$location.purpose", 0] },
                    consentStatus: { $arrayElemAt: ["$location.consentStatus", 0] },
                    "timestamps.location": {
                        createdAt: { $arrayElemAt: ["$location.createdAt", 0] },
                        updatedAt: { $arrayElemAt: ["$location.updatedAt", 0] },
                        deletedAt: { $arrayElemAt: ["$location.deletedAt", 0] }
                    },
                    username: { $arrayElemAt: ["$user.username", 0] }
                }
            }
        ]);

        if (data.length > 0) {
            res.json(data[0]);
        } else {
            res.status(404).json({ message: "No data found for this consent ID" });
        }
    } catch (error) {
        console.error("Error fetching GDPR data for consentId:", consentId, error);
        res.status(500).json({ error: "Failed to fetch GDPR data", details: error.message });
    }
});

// Optional: Add DELETE endpoint if not already in locationRoutes.js
router.delete("/gdpr-data/:consentId", async (req, res) => {
    const { consentId } = req.params;
    try {
        const location = await Location.findOne({ consentId, deletedAt: null });
        if (!location) {
            return res.status(404).json({ message: "Location data not found or already deleted" });
        }

        await location.softDelete();
        res.json({ message: `Successfully soft-deleted data for Consent ID: ${consentId}` });
    } catch (error) {
        console.error("Error soft-deleting GDPR data:", error);
        res.status(500).json({ error: "Failed to soft-delete GDPR data", details: error.message });
    }
});

module.exports = router;