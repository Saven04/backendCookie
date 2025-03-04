const { createClient } = require("@supabase/supabase-js");

// ✅ Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Supabase URL and Key are required in .env file!");
}

// ✅ Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;
