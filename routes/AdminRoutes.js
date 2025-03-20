const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const CookiePreferences = require("../models/cookiePreference");
const Location = require("../models/locationData");
const User = require("../models/user");
const Admin = require("../models/admin");
const AuditLog = require("../models/auditlogs");

// Middleware to verify admin JWT token
const adminAuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        req.adminId = decoded.adminId; // Store admin ID for audit logging
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

// Admin login
router.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });
        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        // Generate JWT token
        const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET || "your-secret-key", {
            expiresIn: "1h"
        });

        // Log login action
        await AuditLog.create({
            adminId: admin._id,
            action: "login",
            ipAddress: req.ip || "unknown",
            details: `Admin ${username} logged in`
        });

        res.json({ token });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
});

// Apply auth middleware to protected routes
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

        // Log data fetch action
        await AuditLog.create({
            adminId: req.adminId,
            action: "data-fetch",
            ipAddress: req.ip || "unknown",
            details: "Fetched all GDPR data"
        });

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

        // Log data fetch action
        await AuditLog.create({
            adminId: req.adminId,
            action: "data-fetch",
            consentId,
            ipAddress: req.ip || "unknown",
            details: `Fetched GDPR data for consentId: ${consentId}`
        });

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

// Soft-delete GDPR data
router.post("/api/admin/soft-delete", async (req, res) => {
    const { consentId } = req.body;
    if (!consentId) {
        return res.status(400).json({ message: "Consent ID is required" });
    }

    try {
        const location = await Location.findOne({ consentId });
        if (location && !location.deletedAt) {
            await location.softDelete();
        }

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

        // Log soft-delete action
        await AuditLog.create({
            adminId: req.adminId,
            action: "soft-delete",
            consentId,
            ipAddress: req.ip || "unknown",
            details: `Soft-deleted data for consentId: ${consentId}`
        });

        res.json({ message: `Successfully soft-deleted data for Consent ID: ${consentId}` });
    } catch (error) {
        console.error("Error soft-deleting GDPR data:", error);
        res.status(500).json({ error: "Failed to soft-delete GDPR data", details: error.message });
    }
});

// Logout (optional, if you want server-side logout tracking)
router.post("/api/admin/logout", async (req, res) => {
    try {
        await AuditLog.create({
            adminId: req.adminId,
            action: "logout",
            ipAddress: req.ip || "unknown",
            details: "Admin logged out"
        });
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Error logging out:", error);
        res.status(500).json({ message: "Logout failed" });
    }
});

module.exports = router;