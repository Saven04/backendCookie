const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const CookiePreference = require("../models/cookiePreference");
const LocationData = require("../models/locationData");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Middleware to parse JSON bodies
router.use(express.json());

// Helper function to get client IP
function getClientIp(req) {
    // Check X-Forwarded-For header first (for proxies/load balancers)
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs; take the first one (client IP)
        return forwardedFor.split(",")[0].trim();
    }
    // Fallback to req.ip if no proxy
    return req.ip;
}

// POST /api/register - Register a new user
router.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, consentId, preferences } = req.body;

        // Validate inputs
        if (!username || !email || !password || !consentId) {
            return res.status(400).json({ message: "Username, email, password, and consentId are required!" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Handle cookie preferences
        let cookiePrefs;
        if (preferences && typeof preferences === "object") {
            cookiePrefs = await CookiePreference.findOneAndUpdate(
                { consentId },
                {
                    preferences: {
                        strictlyNecessary: true,
                        performance: preferences.performance || false,
                        functional: preferences.functional || false,
                        advertising: preferences.advertising || false,
                        socialMedia: preferences.socialMedia || false
                    },
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } else {
            cookiePrefs = await CookiePreference.findOne({ consentId });
            if (!cookiePrefs) {
                return res.status(400).json({
                    message: "Cookie preferences are required. Please set them before registering."
                });
            }
        }

        // Update location data based on consent
        const hasConsent = cookiePrefs.preferences.performance ||
                          cookiePrefs.preferences.functional ||
                          cookiePrefs.preferences.advertising ||
                          cookiePrefs.preferences.socialMedia;

        let locationData = await LocationData.findOne({ consentId });
        const clientIp = getClientIp(req);

        if (hasConsent) {
            // Fetch location data using the client's IP
            const ipResponse = await fetch(`https://ipinfo.io/${clientIp}/json?token=10772b28291307`);
            if (!ipResponse.ok) {
                console.warn(`Failed to fetch location data for IP ${clientIp}: ${ipResponse.status}`);
                // Fallback to basic IP storage if geolocation fails
                locationData = await LocationData.findOneAndUpdate(
                    { consentId },
                    {
                        ipAddress: clientIp || "unknown",
                        isp: "unknown",
                        city: "unknown",
                        country: "unknown",
                        purpose: "consent-logging",
                        consentStatus: "accepted",
                        updatedAt: new Date(),
                        deletedAt: null,
                        expiresAt: null
                    },
                    { upsert: true, new: true }
                );
            } else {
                const ipData = await ipResponse.json();

                locationData = await LocationData.findOneAndUpdate(
                    { consentId },
                    {
                        ipAddress: clientIp || ipData.ip || "unknown",
                        isp: ipData.org || "unknown",
                        city: ipData.city || "unknown",
                        country: ipData.country || "unknown",
                        purpose: "consent-logging",
                        consentStatus: "accepted",
                        updatedAt: new Date(),
                        deletedAt: null,
                        expiresAt: null
                    },
                    { upsert: true, new: true }
                );
            }
        } else if (locationData && !locationData.deletedAt) {
            // Soft-delete location data if consent is withdrawn
            await locationData.softDelete();
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create and save new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            consentId
        });
        await newUser.save();
        console.log("User saved successfully:", newUser._id);

        // Verify JWT_SECRET exists
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET is not defined in environment variables");
            return res.status(500).json({ message: "Server configuration error: JWT secret missing" });
        }

        // Generate token
        const token = jwt.sign({ userId: newUser._id }, jwtSecret, { expiresIn: "1h" });
        console.log("Token generated:", token);

        // Return success response
        res.status(201).json({
            message: "User registered successfully!",
            token,
            consentId,
            preferences: cookiePrefs.preferences
        });
    } catch (error) {
        console.error("Registration error:", {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({ message: error.message || "Server error. Please try again later." });
    }
});

// POST /api/login - Authenticate a user
router.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // Fetch cookie preferences
        const cookiePreferences = await CookiePreference.findOne({ consentId: user.consentId });
        if (!cookiePreferences) {
            return res.status(403).json({
                message: "Access denied. Please set cookie preferences before logging in."
            });
        }

        // Fetch or update location data based on consent
        const hasConsent = cookiePreferences.preferences.performance ||
                          cookiePreferences.preferences.functional ||
                          cookiePreferences.preferences.advertising ||
                          cookiePreferences.preferences.socialMedia;

        let locationData = await LocationData.findOne({ consentId: user.consentId });
        const clientIp = getClientIp(req);

        if (hasConsent && (!locationData || locationData.deletedAt)) {
            const ipResponse = await fetch(`https://ipinfo.io/${clientIp}/json?token=10772b28291307`);
            if (!ipResponse.ok) {
                console.warn(`Failed to fetch location data for IP ${clientIp}: ${ipResponse.status}`);
                locationData = await LocationData.findOneAndUpdate(
                    { consentId: user.consentId },
                    {
                        ipAddress: clientIp || "unknown",
                        isp: "unknown",
                        city: "unknown",
                        country: "unknown",
                        purpose: "consent-logging",
                        consentStatus: "accepted",
                        updatedAt: new Date(),
                        deletedAt: null,
                        expiresAt: null
                    },
                    { upsert: true, new: true }
                );
            } else {
                const ipData = await ipResponse.json();

                locationData = await LocationData.findOneAndUpdate(
                    { consentId: user.consentId },
                    {
                        ipAddress: clientIp || ipData.ip || "unknown",
                        isp: ipData.org || "unknown",
                        city: ipData.city || "unknown",
                        country: ipData.country || "unknown",
                        purpose: "consent-logging",
                        consentStatus: "accepted",
                        updatedAt: new Date(),
                        deletedAt: null,
                        expiresAt: null
                    },
                    { upsert: true, new: true }
                );
            }
        } else if (!hasConsent && locationData && !locationData.deletedAt) {
            await locationData.softDelete();
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({
            message: "Login successful!",
            token,
            consentId: user.consentId,
            cookiePreferences: cookiePreferences.preferences || {},
            cookiesAccepted: true
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;