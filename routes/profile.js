// routes/profile.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const Location = require('../models/locationData');

// JWT Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.user = decoded; // { id: user._id, ... }
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) cb(null, true);
        else cb(new Error('Only images (jpeg, jpg, png) are allowed'));
    }
});

// GET /api/user-profile
router.get('/user-profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user || user.deletedAt) return res.status(404).json({ success: false, message: 'User not found or deleted' });

        const location = await Location.findOne({ consentId: user.consentId });
        res.json({
            success: true,
            username: user.username, // Use username instead of name
            email: user.email, // Hashed, will be masked by toJSON
            profilePic: user.profilePic || null,
            location: location?.location || null
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/upload-profile-pic
router.post('/upload-profile-pic', authMiddleware, upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const profilePicPath = `/uploads/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profilePic: profilePicPath, lastActive: Date.now() }, // Update lastActive
            { new: true }
        );

        if (!user || user.deletedAt) return res.status(404).json({ success: false, message: 'User not found or deleted' });

        res.json({
            success: true,
            profilePic: profilePicPath,
            message: 'Profile picture updated'
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
});

// POST /api/update-profile
router.post('/update-profile', authMiddleware, async (req, res) => {
    try {
        const { username } = req.body; // Use username instead of name
        if (!username || typeof username !== 'string' || username.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Valid username is required' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { username: username.trim(), lastActive: Date.now() }, // Update lastActive
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