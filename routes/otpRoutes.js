const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit'); // Import rate-limiting middleware
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Rate limiter: Allow only 5 requests per hour for sending OTPs
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 requests per hour
    message: 'Too many OTP requests. Please try again later.',
});

// Send OTP Route (with rate limiting)
router.post('/send-otp', otpLimiter, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
        // Generate and send OTP using Supabase Auth
        const { data, error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: 'https://t10hits.netlify.app/news.html',
            },
        });

        if (error) {
            console.error('Error sending OTP:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
        }

        console.log(`OTP sent to ${email}`);
        return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
    } catch (err) {
        console.error('Unexpected error:', err.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
    }
});

// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    try {
        // Verify OTP using Supabase Auth
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email',
        });

        if (error) {
            console.error('Error verifying OTP:', error.message);
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        console.log(`OTP verified for ${email}`);
        return res.status(200).json({ success: true, message: 'OTP verified successfully.' });
    } catch (err) {
        console.error('Unexpected error:', err.message);
        return res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
    }
});

module.exports = router;