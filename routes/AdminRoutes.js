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
    if (!token) {
        console.log("Middleware: No token provided in headers");
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        req.adminId = decoded.adminId;
        console.log("Middleware: Token verified, adminId:", req.adminId);
        next();
    } catch (error) {
        console.error("Middleware: Token verification failed:", error.message);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
// Admin login with email and password
router.post("/admin/login", async (req, res) => {
    const { email, password } = req.body;
    console.log("Login attempt:", { email, password }); // Debug log

    if (!email || !password) {
        console.log("Login failed: Missing email or password");
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            console.log("Login failed: Admin not found for email:", email);
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            console.log("Login failed: Password mismatch for email:", email);
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        console.log("Admin lastLogin updated:", email);

        // Generate JWT token
        const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET || "your-secret-key", {
            expiresIn: "1h"
        });
        console.log("Token generated for admin:", email);

        // Log login action
        await AuditLog.create({
            adminId: admin._id,
            action: "login",
            ipAddress: req.ip || "unknown",
            details: `Admin ${email} logged in`
        });
        console.log("Audit log created for login:", email);

        res.json({ token });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ message: "Server error during login", error: error.message });
    }
});

// Apply auth middleware to protected routes ONLY
router.use(adminAuthMiddleware);

// Fetch all GDPR data
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

// Logout
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

// Seed the default admin user (with force reseed option for debugging)
const seedAdmin = async () => {
    try {
        const existingAdmin = await Admin.findOne({ email: "venkatsaikarthi@gmail.com" });
        if (!existingAdmin) {
            const admin = new Admin({
                username: "venkatsaikarthi", // Optional
                email: "venkatsaikarthi@gmail.com",
                password: "22337044" // Will be hashed
            });
            await admin.save();
            console.log("Default admin created: venkatsaikarthi@gmail.com / 22337044");
        } else {
            console.log("Default admin already exists:", existingAdmin.email);
            // Optional: Force reseed for debugging (uncomment if needed)
            // await Admin.deleteOne({ email: "venkatsaikarthi@gmail.com" });
            // const admin = new Admin({
            //     username: "venkatsaikarthi",
            //     email: "venkatsaikarthi@gmail.com",
            //     password: "22337044"
            // });
            // await admin.save();
            // console.log("Default admin re-seeded: venkatsaikarthi@gmail.com / 22337044");
        }
    } catch (error) {
        console.error("Error seeding default admin:", error);
    }
};
seedAdmin();

module.exports = router;