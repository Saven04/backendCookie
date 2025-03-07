require("dotenv").config(); 
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Get real client IP
const axios = require("axios");
const session = require("express-session"); // Add session support
const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");
const deleteRoutes = require("./routes/deleteRoutes");
const newsRoutes = require("./routes/newsRoutes");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;


const app = express();

app.use(express.json());
// CORS Configuration
const allowedOrigins = ["https://t10hits.netlify.app"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"], // Allow credentials headers
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Use a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use `secure` cookies in production (HTTPS)
      httpOnly: true,
      sameSite: "strict",
    },
  })
);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "CookieDB",
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};
connectDB();

// Routes
app.use("/api", cookieRoutes); // Cookie-related routes
app.use("/api", authRoutes); 
app.use("/api/news", newsRoutes);
app.use(deleteRoutes);






// Send OTP Endpoint
app.post('/send-otp', async (req, res) => {
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


app.post('/verify-otp', async (req, res) => {
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


// ✅ Route to get the real client IP and fetch geolocation data from `ip-api.com`
app.get("/api/get-ipinfo", async (req, res) => {
  try {
    let clientIp = requestIp.getClientIp(req) || "Unknown";

    if (clientIp.includes("::ffff:")) {
      clientIp = clientIp.split("::ffff:")[1];
    }

    console.log("📌 Detected Client IP:", clientIp);

    // Fetch geolocation data from `ip-api.com`
    const response = await axios.get(`http://ip-api.com/json/${clientIp}`);

    res.json({
      ip: clientIp,
      city: response.data.city || "Unknown",
      region: response.data.regionName || "Unknown",
      country: response.data.country || "Unknown",
      isp: response.data.isp || "Unknown",
    });
  } catch (error) {
    console.error("❌ Error fetching IP info:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running on Render and healthy." });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: "❌ Route not found." });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
