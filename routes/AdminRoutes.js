const express = require('express');
const router = express.Router();
const CookiePreferences = require('../models/cookiePreference');
const Location = require('../models/locationData');
const User = require('../models/user');

// Get all GDPR data
router.get('/gdpr-data', async (req, res) => {
    try {
        const data = await CookiePreferences.aggregate([
            {
                $lookup: {
                    from: 'locations',
                    localField: 'consentId',
                    foreignField: 'consentId',
                    as: 'location'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'consentId',
                    foreignField: 'consentId',
                    as: 'user'
                }
            },
            {
                $project: {
                    consentId: 1,
                    preferences: 1,
                    timestamp: 1,
                    ipAddress: { $arrayElemAt: ['$location.ipAddress', 0] },
                    username: { $arrayElemAt: ['$user.username', 0] }
                }
            }
        ]);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search by consentId
router.get('/gdpr-data/:consentId', async (req, res) => {
    const { consentId } = req.params;
    try {
        const data = await CookiePreferences.aggregate([
            { $match: { consentId } },
            {
                $lookup: {
                    from: 'locations',
                    localField: 'consentId',
                    foreignField: 'consentId',
                    as: 'location'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'consentId',
                    foreignField: 'consentId',
                    as: 'user'
                }
            },
            {
                $project: {
                    consentId: 1,
                    preferences: 1,
                    timestamp: 1,
                    ipAddress: { $arrayElemAt: ['$location.ipAddress', 0] },
                    username: { $arrayElemAt: ['$user.username', 0] }
                }
            }
        ]);
        if (data.length > 0) {
            res.json(data[0]);
        } else {
            res.status(404).json({ message: 'No data found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;