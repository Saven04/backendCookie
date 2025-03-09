const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs'); // Required for password hashing
const authMiddleware = require('../middleware/authMiddleware'); // Import your auth middleware

// GET /api/user-profile
router.get('/user-profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user || user.deletedAt) {
            return res.status(404).json({ success: false, message: 'User not found or deleted' });
        }
        res.json({
            success: true,
            username: user.username,
            email: '****@*****.***' // Masked for GDPR compliance
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/update-profile
router.post('/update-profile', authMiddleware, async (req, res) => {
    try {
        const { username, email, password, mfaCode } = req.body;
        const updates = {};

        // Validate inputs
        if (username && typeof username === 'string' && username.trim().length >= 2) {
            updates.username = username.trim();
        }
        if (email && typeof email === 'string' && /\S+@\S+\.\S+/.test(email)) {
            updates.email = email; // Will be hashed by set: hashEmail in User model
        }
        if (password && typeof password === 'string' && password.length >= 6) {
            updates.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid updates provided' });
        }

        // Verify MFA code using existing endpoint (assumes verifyMfa.js handles this)
        const verifyResponse = await fetch('https://backendcookie-8qc1.onrender.com/api/verify-mfa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${req.headers.authorization.split('Bearer ')[1]}`
            },
            body: JSON.stringify({ code: mfaCode })
        });
        const verifyData = await verifyResponse.json();
        if (!verifyResponse.ok || !verifyData.success) {
            return res.status(400).json({ success: false, message: verifyData.message || 'Invalid or expired MFA code' });
        }

        // Apply updates
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { ...updates, lastActive: Date.now() },
            { new: true }
        );
        if (!user || user.deletedAt) {
            return res.status(404).json({ success: false, message: 'User not found or deleted' });
        }

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