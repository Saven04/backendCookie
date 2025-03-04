require("dotenv").config(); // Load environment variables
const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URI; // Read from .env
const client = new MongoClient(mongoUri);

async function verifyMfa(consentId, mfaCode, method = "email") {
    try {
        await client.connect();
        const db = client.db(process.env.DB_NAME); // Database name from .env
        const usersCollection = db.collection("users"); // Collection name

        // Fetch user details based on Consent ID
        const user = await usersCollection.findOne({ consent_id: consentId });

        if (!user) {
            throw new Error("User not found for given Consent ID");
        }

        let verificationData;

        if (method === "sms") {
            if (!user.phone) throw new Error("User phone number not found");
            verificationData = {
                phone: user.phone,
                token: mfaCode,
                type: "sms"
            };
        } else if (method === "email") {
            if (!user.email) throw new Error("User email not found");
            verificationData = {
                email: user.email,
                token: mfaCode,
                type: "email"
            };
        } else {
            throw new Error("Invalid MFA method. Use 'sms' or 'email'.");
        }

        // Check if MFA code matches the stored OTP
        const storedOtp = user.otp; // Assuming OTP is stored in `otp` field
        if (storedOtp !== mfaCode) {
            console.error("MFA Verification Error: Invalid OTP");
            return false;
        }

        console.log("✅ MFA Verification Successful");
        return true;
    } catch (error) {
        console.error("❌ Error in verifyMfa:", error.message);
        return false;
    } finally {
        await client.close();
    }
}

module.exports = { verifyMfa };
