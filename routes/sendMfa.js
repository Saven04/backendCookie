// routes/sendMfa.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const CookiePreferences = require("../models/cookiePreference"); // Import model

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.APP_PASSWORD }
});

let mfaCodes;

router.post("/", async (req, res) => {
    const user = req.user;
    if (!user || !user._id) {
        return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    const { email, consentId } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    if (!consentId) {
        return res.status(400).json({ message: "Consent ID is required" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;

    mfaCodes.set(user._id.toString(), { code, expires, consentId });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your MFA Verification Code",
        text: `Your verification code is: ${code}. It expires in 5 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "MFA code sent" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Failed to send MFA code" });
    }
});

module.exports = (codes) => {
    mfaCodes = codes;
    return router;
};