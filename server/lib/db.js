import mongoose from 'mongoose';

// Ensure we don't reconnect if already connected
let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGO_URI || 'mongodb+srv://puneethvenkat2k03:WebDev74@roomentry.gakbx.mongodb.net/?retryWrites=true&w=majority&appName=RoomEntry';

  try {
    await mongoose.connect(uri, {
      dbName: 'RoomEntry_DDoS' // Overriding database name for DDoS logs
    });
    isConnected = true;
    console.log('✓ Successfully connected to MongoDB for DDoS logs');
  } catch (err) {
    console.error('✗ Failed to connect to MongoDB:', err);
  }
}

// Schemas
const uploadLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userId: String,
  ipAddress: String,
  fileHash: String,
  fileSize: Number,
  filename: String,
  uploadDurationMs: Number,
  success: Number,
  error: String,
  riskLevel: String,
  anomalyScore: Number,
  action: String
});

const ddosStatsSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  totalUploads: Number,
  totalSize: Number,
  averageFileSize: Number,
  duplicateRate: Number,
  failureRate: Number,
  threatScore: Number
});

export const UploadLog = mongoose.model('UploadLog', uploadLogSchema);
export const DDoSStat = mongoose.model('DDoSStat', ddosStatsSchema);
