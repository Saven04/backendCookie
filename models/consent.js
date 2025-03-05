const mongoose = require("mongoose");

const ConsentSchema = new mongoose.Schema({
    consentId: { 
        type: String, 
        required: true, 
        unique: true 
    }, // Unique identifier for consent

    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    }, // Links to the User collection

    preferences: { 
        type: Object, 
        required: true 
    }, // Cookie preferences (JSON object)

    locationData: { 
        type: Object 
    }, // Optional location data (JSON object)

}, { timestamps: true }); // Automatically adds `createdAt` and `updatedAt` fields

const Consent = mongoose.model("Consent", ConsentSchema);
module.exports = Consent;