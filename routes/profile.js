// routes/profile.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const nodemailer = require('nodemailer'); // For sending MFA emails

// JWT Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded;
        if (!req.user.userId) throw new Error('User ID missing in token');
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Email transporter (configure with your SMTP service)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Example: Use Gmail or your SMTP provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Store MFA codes temporarily (in-memory for simplicity; use Redis in production)
const mfaCodes = new Map();

// GET /api/user-profile
router.get('/user-profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user || user.deletedAt) return res.status(404).json({ success: false, message: 'User not found or deleted' });
        res.json({
            success: true,
            username: user.username,
            email: '****@*****.***'
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/send-mfa-code
router.post('/send-mfa-code', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user || user.deletedAt) return res.status(404).json({ success: false, message: 'User not found or deleted' });

        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        mfaCodes.set(user._id.toString(), { code, expires: Date.now() + 5 * 60 * 1000 }); // 5-minute expiry

        // Send email (assumes you have user’s original email elsewhere; here we mock it)
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'user@example.com', // Replace with actual email retrieval logic
            subject: 'Your MFA Code',
            text: `Your MFA code is: ${code}. It expires in 5 minutes.`
        });

        res.json({ success: true, message: 'MFA code sent' });
    } catch (error) {
        console.error('Error sending MFA code:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/verify-mfa-code
router.post('/verify-mfa-code', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.userId;
        const mfaData = mfaCodes.get(userId);

        if (!mfaData || mfaData.code !== code || Date.now() > mfaData.expires) {
            return res.status(400).json({ success: false, message: 'Invalid or expired MFA code' });
        }

        mfaCodes.delete(userId); // Clear code after use
        res.json({ success: true, message: 'MFA code verified' });
    } catch (error) {
        console.error('Error verifying MFA code:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/update-profile
router.post('/update-profile', authMiddleware, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const updates = {};

        if (username && typeof username === 'string' && username.trim().length >= 2) {
            updates.username = username.trim();
        }
        if (email && typeof email === 'string' && /\S+@\S+\.\S+/.test(email)) {
            updates.email = email; // Will be hashed by set: hashEmail
        }
        if (password && typeof password === 'string' && password.length >= 6) {
            const bcrypt = require('bcryptjs');
            updates.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid updates provided' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { ...updates, lastActive: Date.now() },
            { new: true }
        );
        if (!user || user.deletedAt) return res.status(404).json({ success: false, message: 'User not found or deleted' });

        res.json({
            success: true,
            username: user.username,
            message: 'Profile updated'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;