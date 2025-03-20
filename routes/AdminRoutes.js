const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/cookiePreference");
const Location = require("../models/locationData");
const User = require("../models/user");

// Middleware to ensure admin access (example, adjust based on your setup)
const adminAuthMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token || token !== process.env.ADMIN_TOKEN) { // Replace with your auth logic
        return res.status(401).json({ message: "Unauthorized: Admin access required" });
    }
    next();
};

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Fetch all GDPR data
router.get("/api/gdpr-data", async (req, res) => {
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
                        updatedAt: "$updatedAt",
                        deletedAt: "$deletedAt" // Include deletedAt for CookiePreferences
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

        res.json(data.length === 0 ? [] : data);
    } catch (error) {
        console.error("Error fetching GDPR data:", error);
        res.status(500).json({ error: "Failed to fetch GDPR data", details: error.message });
    }
});

// Fetch GDPR data by consentId
router.get("/api/gdpr-data/:consentId", async (req, res) => {
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
                        updatedAt: "$updatedAt",
                        deletedAt: "$deletedAt"
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

// Soft-delete GDPR data (used by dashboard.js)
router.post("/api/admin/soft-delete", async (req, res) => {
    const { consentId } = req.body;
    if (!consentId) {
        return res.status(400).json({ message: "Consent ID is required" });
    }

    try {
        // Soft-delete Location
        const location = await Location.findOne({ consentId });
        if (location && !location.deletedAt) {
            await location.softDelete();
        }

        // Soft-delete CookiePreferences
        const cookiePrefs = await CookiePreferences.findOne({ consentId });
        if (cookiePrefs && !cookiePrefs.deletedAt) {
            await CookiePreferences.updateOne(
                { consentId },
                {
                    $set: {
                        "preferences.performance": false,
                        "preferences.functional": false,
                        "preferences.advertising": false,
                        "preferences.socialMedia": false,
                        deletedAt: new Date()
                    }
                }
            );
        }

        res.json({ message: `Successfully soft-deleted data for Consent ID: ${consentId}` });
    } catch (error) {
        console.error("Error soft-deleting GDPR data:", error);
        res.status(500).json({ error: "Failed to soft-delete GDPR data", details: error.message });
    }
});

module.exports = router;