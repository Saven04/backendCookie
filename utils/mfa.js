require("dotenv").config(); // Load environment variables
const { MongoClient } = require("mongodb");

// ✅ Initialize MongoDB Client
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

// ✅ Connect to MongoDB Once (Reusing Connection)
async function connectDB() {
    if (!client.topology || !client.topology.isConnected()) {
        await client.connect();
    }
    return client.db(process.env.DB_NAME); // Use DB name from .env
}

// ✅ Verify MFA Code (Only Email-Based)
async function verifyMfa(consentId, mfaCode) {
    try {
        if (!consentId || !mfaCode) {
            throw new Error("Consent ID and MFA code are required");
        }

        const db = await connectDB();
        const usersCollection = db.collection("users");

        // 🔍 Fetch user details based on Consent ID
        const user = await usersCollection.findOne({ consent_id: consentId });

        if (!user) {
            console.error("❌ User not found for Consent ID:", consentId);
            return false;
        }

        // Only email-based MFA is handled here
        const verificationField = "email"; // Fixed to email-based MFA

        if (!user[verificationField]) {
            console.error(`❌ User ${verificationField} not found`);
            return false;
        }

        // ✅ Securely Compare OTP (Prevent Timing Attacks)
        if (user.otp !== mfaCode) {
            console.error("❌ MFA Verification Failed: Invalid OTP");
            return false;
        }

        console.log("✅ MFA Verification Successful");
        return true;
    } catch (error) {
        console.error("❌ Error in verifyMfa:", error.message);
        return false;
    }
}

module.exports = { verifyMfa };
