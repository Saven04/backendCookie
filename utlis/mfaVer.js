const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://ieyefjxdupzywnmqltnw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleWVmanhkdXB6eXdubXFsdG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MTg2ODIsImV4cCI6MjA1NjQ5NDY4Mn0.Bcl4f67ub3t0MCveOq1zlO9-bD5uRbv12mu-ONG0Whc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMfa(consentId, mfaCode, method = "email") {
    try {
        let verificationData;
        
        if (method === "sms") {
            verificationData = {
                phone: `+91XXXXXXXXXX`, // Fetch user's phone number from DB
                token: mfaCode,
                type: "sms"
            };
        } else if (method === "email") {
            verificationData = {
                email: "user@example.com", // Fetch user's email from DB
                token: mfaCode,
                type: "email"
            };
        } else {
            throw new Error("Invalid MFA method. Use 'sms' or 'email'.");
        }

        const { data, error } = await supabase.auth.verifyOtp(verificationData);

        if (error) {
            console.error("MFA Verification Error:", error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error in verifyMfa:", error.message);
        return false;
    }
}

module.exports = { verifyMfa };
