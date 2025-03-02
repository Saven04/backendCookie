const Counter = require("../models/counter");

const getNextSequence = async (counterName) => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: counterName },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    return counter.seq.toString(); // Convert to string for uniformity
  } catch (error) {
    console.error("❌ Error generating sequence:", error.message);
    throw new Error("Failed to generate unique consent ID.");
  }
};

module.exports = { getNextSequence };
