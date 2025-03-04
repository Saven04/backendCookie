const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { verifyMfa } = require("../utils/mfa");
const router = express.Router();

// ✅ Initialize MongoDB Client
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

// ✅ Connect to MongoDB Once
async function connectDB() {
    try {
        if (!client.isConnected()) {
            await client.connect();
        }
        return client.db(process.env.DB_NAME); // Use DB name from environment
    } catch (error) {
        console.error("❌ Error connecting to DB:", error.message);
        throw new Error("Could not connect to database");
    }
}

// ✅ Nodemailer Transporter for Emails
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Generate a Secure Random OTP
function generateOtp() {
    return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
}

// ✅ 📩 Request MFA OTP (Sends OTP via Email)
router.post("/request-mfa", async (req, res) => {
    try {
        const { consentId } = req.body; // Removed 'method' field since only email is supported now
        if (!consentId) {
            return res.status(400).json({ message: "Consent ID is required" });
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        // 🔍 Find user by consent ID
        const user = await usersCollection.findOne({ consent_id: consentId });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const recipient = user.email; // Only handle email for MFA

        if (!recipient) {
            return res.status(400).json({ message: "User email not found" });
        }

        // 🔹 Generate and store OTP
        const otp = generateOtp();
        await usersCollection.updateOne({ consent_id: consentId }, { $set: { otp, otp_expires: Date.now() + 300000 } }); // OTP expires in 5 mins

        // 🔹 Send OTP via Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: recipient,
            subject: "Your MFA Code",
            text: `Your OTP code is: ${otp}. It expires in 5 minutes.`,
        });

        console.log(`✅ OTP sent to email: ${recipient}`);
        res.json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("❌ Error in /request-mfa:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

// ✅ 🔐 Verify MFA OTP
router.post("/verify-mfa", async (req, res) => {
    try {
        const { consentId, mfaCode } = req.body;
        if (!consentId || !mfaCode) {
            return res.status(400).json({ message: "Consent ID and MFA code are required" });
        }

        const isValid = await verifyMfa(consentId, mfaCode, "email"); // Always use email method for MFA

        if (!isValid) {
            return res.status(401).json({ message: "Invalid or expired OTP" });
        }

        res.json({ message: "MFA verified successfully" });
    } catch (error) {
        console.error("❌ Error in /verify-mfa:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
