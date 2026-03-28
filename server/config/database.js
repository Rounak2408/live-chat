/**
 * MongoDB Database Configuration
 * Uses MONGODB_URI or DATABASE_URL (Render / Atlas often use either name)
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();

  if (!uri) {
    console.error(
      '❌ MongoDB URI is not set.\n' +
        '   On Render: Dashboard → your Web Service → Environment → add:\n' +
        '   MONGODB_URI = your MongoDB connection string (from Atlas → Connect → Drivers)\n' +
        '   Or set DATABASE_URL with the same value.\n' +
        '   Local .env is not uploaded to GitHub; Render needs variables added manually.'
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
