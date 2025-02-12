const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
    {
        consentId: { 
            type: String, 
            required: true, 
            trim: true 
        },
        ipAddress: { 
            type: String, 
            required: true, 
            trim: true 
        }, // Store anonymized IP
        isp: { 
            type: String, 
            default: "Unknown ISP", 
            trim: true 
        },
        city: { 
            type: String, 
            default: "Unknown City", 
            trim: true 
        },
        region: { 
            type: String, 
            default: "Unknown Region", 
            trim: true 
        },
        country: { 
            type: String, 
            default: "Unknown Country", 
            trim: true 
        },
        latitude: { 
            type: Number, 
            min: -90, 
            max: 90 
        },
        longitude: { 
            type: Number, 
            min: -180, 
            max: 180 
        },
        postalCode: { 
            type: String, 
            default: "Unknown", 
            trim: true 
        },
        timezone: { 
            type: String, 
            default: "Unknown Timezone", 
            trim: true 
        },
        createdAt: { 
            type: Date, 
            default: Date.now, 
            expires: "365d" // Auto-delete after 1 year
        }
    },
    { timestamps: true } // Automatically adds `createdAt` & `updatedAt`
);

const LocationData = mongoose.model("LocationData", locationSchema);
module.exports = LocationData;
