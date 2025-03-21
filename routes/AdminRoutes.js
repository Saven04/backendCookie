const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const CookiePreferences = require('../models/cookiePreference');
const Location = require('../models/locationData');
const User = require('../models/user');
const Admin = require('../models/admin');
const AuditLog = require('../models/auditlogs');

// Middleware to verify admin JWT token
const adminAuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        console.log('Middleware: No token provided in headers', { method: req.method, path: req.path });
        return res.status(401).json({ message: 'No token provided', error: 'Authentication required' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.adminId = decoded.adminId;
        console.log('Middleware: Token verified', { adminId: req.adminId, path: req.path });
        next();
    } catch (error) {
        console.error('Middleware: Token verification failed', { error: error.message, path: req.path });
        return res.status(401).json({ message: 'Invalid or expired token', error: error.message });
    }
};

// Admin login
router.post('/loginAdmin', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt', { email });

    if (!email || !password) {
        console.log('Login failed: Missing credentials', { email });
        return res.status(400).json({ message: 'Email and password are required', error: 'Bad Request' });
    }

    try {
        const admin = await Admin.findOne({ email });
        if (!admin) {
            console.log('Login failed: Admin not found', { email });
            return res.status(401).json({ message: 'Invalid email or password', error: 'Unauthorized' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            console.log('Login failed: Incorrect password', { email });
            return res.status(401).json({ message: 'Invalid email or password', error: 'Unauthorized' });
        }

        admin.lastLogin = new Date();
        await admin.save();
        console.log('Admin lastLogin updated', { email });

        const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
        console.log('Token generated', { email, token: token.slice(0, 10) + '...' });

        await AuditLog.create({
            adminId: admin._id,
            action: 'login',
            ipAddress: req.ip || 'unknown',
            details: `Admin ${email} logged in`
        });
        console.log('Audit log created for login', { email });

        res.json({ token });
    } catch (error) {
        console.error('Admin login error', { email, error: error.message });
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
});

// Apply auth middleware to protected routes
router.use(adminAuthMiddleware);

// Fetch all GDPR data with optional search/filter
router.get('/gdpr-data', async (req, res) => {
    const { consentId, ipAddress } = req.query;
    console.log('Fetching GDPR data', { consentId, ipAddress });

    try {
        const pipeline = [];
        const matchConditions = {};
        if (consentId) matchConditions.consentId = consentId;
        if (Object.keys(matchConditions).length > 0) pipeline.push({ $match: matchConditions });

        pipeline.push(
            { $lookup: { from: 'locations', localField: 'consentId', foreignField: 'consentId', as: 'location' } },
            { $lookup: { from: 'users', localField: 'consentId', foreignField: 'consentId', as: 'user' } }
        );

        if (ipAddress) pipeline.push({ $match: { 'location.ipAddress': ipAddress } });

        pipeline.push({
            $project: {
                consentId: 1,
                preferences: 1,
                'timestamps.cookiePreferences': { createdAt: '$createdAt', updatedAt: '$updatedAt', deletedAt: '$deletedAt' },
                ipAddress: { $arrayElemAt: ['$location.ipAddress', 0] },
                isp: { $arrayElemAt: ['$location.isp', 0] },
                city: { $arrayElemAt: ['$location.city', 0] },
                country: { $arrayElemAt: ['$location.country', 0] },
                purpose: { $arrayElemAt: ['$location.purpose', 0] },
                consentStatus: { $arrayElemAt: ['$location.consentStatus', 0] },
                'timestamps.location': {
                    createdAt: { $arrayElemAt: ['$location.createdAt', 0] },
                    updatedAt: { $arrayElemAt: ['$location.updatedAt', 0] },
                    deletedAt: { $arrayElemAt: ['$location.deletedAt', 0] }
                },
                username: { $arrayElemAt: ['$user.username', 0] }
            }
        });

        const data = await CookiePreferences.aggregate(pipeline);
        console.log('GDPR data fetched', { count: data.length, consentId, ipAddress });

        await AuditLog.create({
            adminId: req.adminId,
            action: 'data-fetch',
            ipAddress: req.ip || 'unknown',
            details: `Fetched GDPR data with filters: consentId=${consentId || 'all'}, ipAddress=${ipAddress || 'all'}`
        });

        res.json(data.length === 0 ? [] : data);
    } catch (error) {
        console.error('Error fetching GDPR data', { consentId, ipAddress, error: error.message });
        res.status(500).json({ message: 'Failed to fetch GDPR data', error: error.message });
    }
});

// Fetch GDPR data by consentId (exact match)
router.get('/gdpr-data/:consentId', async (req, res) => {
    const { consentId } = req.params;
    console.log('Fetching GDPR data by consentId', { consentId });

    try {
        const data = await CookiePreferences.aggregate([
            { $match: { consentId } },
            { $lookup: { from: 'locations', localField: 'consentId', foreignField: 'consentId', as: 'location' } },
            { $lookup: { from: 'users', localField: 'consentId', foreignField: 'consentId', as: 'user' } },
            {
                $project: {
                    consentId: 1,
                    preferences: 1,
                    'timestamps.cookiePreferences': { createdAt: '$createdAt', updatedAt: '$updatedAt', deletedAt: '$deletedAt' },
                    ipAddress: { $arrayElemAt: ['$location.ipAddress', 0] },
                    isp: { $arrayElemAt: ['$location.isp', 0] },
                    city: { $arrayElemAt: ['$location.city', 0] },
                    country: { $arrayElemAt: ['$location.country', 0] },
                    purpose: { $arrayElemAt: ['$location.purpose', 0] },
                    consentStatus: { $arrayElemAt: ['$location.consentStatus', 0] },
                    'timestamps.location': {
                        createdAt: { $arrayElemAt: ['$location.createdAt', 0] },
                        updatedAt: { $arrayElemAt: ['$location.updatedAt', 0] },
                        deletedAt: { $arrayElemAt: ['$location.deletedAt', 0] }
                    },
                    username: { $arrayElemAt: ['$user.username', 0] }
                }
            }
        ]);

        console.log('GDPR data fetched by consentId', { consentId, found: data.length > 0 });

        await AuditLog.create({
            adminId: req.adminId,
            action: 'data-fetch',
            ipAddress: req.ip || 'unknown',
            details: `Fetched GDPR data for consentId: ${consentId}`
        });

        if (data.length > 0) {
            res.json(data[0]);
        } else {
            res.status(404).json({ message: `No data found for consentId: ${consentId}`, error: 'Not Found' });
        }
    } catch (error) {
        console.error('Error fetching GDPR data by consentId', { consentId, error: error.message });
        res.status(500).json({ message: 'Failed to fetch GDPR data', error: error.message });
    }
});

// Logout
router.post('/logoutAdmin', async (req, res) => {
    try {
        await AuditLog.create({
            adminId: req.adminId,
            action: 'logout',
            ipAddress: req.ip || 'unknown',
            details: 'Admin logged out'
        });
        console.log('Admin logged out', { adminId: req.adminId });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error during logout', { adminId: req.adminId, error: error.message });
        res.status(500).json({ message: 'Logout failed', error: error.message });
    }
});

// Seed default admin user (only in development or on first run)
if (process.env.NODE_ENV !== 'production') {
    const seedAdmin = async () => {
        try {
            const existingAdmin = await Admin.findOne({ email: 'venkatsaikarthi@gmail.com' });
            if (!existingAdmin) {
                const admin = new Admin({
                    username: 'venkatsaikarthi',
                    email: 'venkatsaikarthi@gmail.com',
                    password: '22337044'
                });
                await admin.save();
                console.log('Default admin created: venkatsaikarthi@gmail.com / 22337044');
            } else {
                console.log('Default admin already exists:', existingAdmin.email);
            }
        } catch (error) {
            console.error('Error seeding default admin:', error.message);
        }
    };
    seedAdmin();
}

module.exports = router;