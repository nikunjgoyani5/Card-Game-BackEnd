// src/config/indexes.ts

import mongoose from "mongoose";
import User from "../models/User.model";
import Room from "../models/Room.model";
import Transaction from "../models/Transaction.model";
import FlipHistory from "../models/FlipHistory.model";
import GameResult from "../models/GameResult.model";
import CriticalError from "../models/CriticalError.model";
import BotActivity from "../models/BotActivity.model";

/**
 * Database Index Setup Utility
 *
 * Creates all required indexes for optimal query performance
 * as specified in the schema documentation (Section 7)
 *
 * Run this script on initial setup or after schema changes
 */

/**
 * Create indexes for Users collection
 * As per Section 7.1 of schema documentation
 */
async function createUserIndexes() {
  console.log("📊 Creating User indexes...");

  try {
    // Note: These indexes are already defined in the User model schema
    // This function ensures they exist and can rebuild if needed

    await User.collection.createIndex(
      { userId: 1 },
      { unique: true, sparse: true }
    );
    console.log("  ✅ userId index created");

    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log("  ✅ email index created");

    await User.collection.createIndex({ username: 1 }, { unique: true });
    console.log("  ✅ username index created");

    await User.collection.createIndex({ "ssn.last4": 1 });
    console.log("  ✅ ssn.last4 index created");

    await User.collection.createIndex({ accountStatus: 1 });
    console.log("  ✅ accountStatus index created");

    console.log("✅ User indexes created successfully\n");
  } catch (error) {
    console.error("❌ Error creating User indexes:", error);
    throw error;
  }
}

/**
 * Create indexes for Rooms collection
 * As per Section 7.2 of schema documentation
 */
async function createRoomIndexes() {
  console.log("📊 Creating Room indexes...");

  try {
    await Room.collection.createIndex(
      { roomId: 1 },
      { unique: true, sparse: true }
    );
    console.log("  ✅ roomId index created");

    await Room.collection.createIndex({ code: 1 }, { unique: true });
    console.log("  ✅ code (roomCode) index created");

    await Room.collection.createIndex({ status: 1, gameMode: 1, roomType: 1 });
    console.log("  ✅ status + gameMode + roomType compound index created");

    await Room.collection.createIndex({
      gameLength: 1,
      betMultiplier: 1,
      status: 1,
    });
    console.log(
      "  ✅ gameLength + betMultiplier + status compound index created"
    );

    await Room.collection.createIndex(
      { scheduledStartTime: 1 },
      { sparse: true }
    );
    console.log("  ✅ scheduledStartTime index created");

    await Room.collection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 86400 }
    );
    console.log("  ✅ createdAt TTL index created (24hr expiry)");

    console.log("✅ Room indexes created successfully\n");
  } catch (error) {
    console.error("❌ Error creating Room indexes:", error);
    throw error;
  }
}

/**
 * Create indexes for Transactions collection
 * As per Section 7.3 of schema documentation
 */
async function createTransactionIndexes() {
  console.log("📊 Creating Transaction indexes...");

  try {
    await Transaction.collection.createIndex(
      { transactionId: 1 },
      { unique: true, sparse: true }
    );
    console.log("  ✅ transactionId index created");

    await Transaction.collection.createIndex({ userId: 1, createdAt: -1 });
    console.log("  ✅ userId + createdAt (desc) compound index created");

    await Transaction.collection.createIndex({ roomId: 1 }, { sparse: true });
    console.log("  ✅ roomId index created");

    await Transaction.collection.createIndex({ type: 1, status: 1 });
    console.log("  ✅ type + status compound index created");

    await Transaction.collection.createIndex({ createdAt: -1 });
    console.log("  ✅ createdAt (desc) index created");

    console.log("✅ Transaction indexes created successfully\n");
  } catch (error) {
    console.error("❌ Error creating Transaction indexes:", error);
    throw error;
  }
}

/**
 * Create indexes for FlipHistory collection
 * As per Section 7.4 of schema documentation
 */
async function createFlipHistoryIndexes() {
  console.log("📊 Creating FlipHistory indexes...");

  try {
    await FlipHistory.collection.createIndex(
      { flipId: 1 },
      { unique: true, sparse: true }
    );
    console.log("  ✅ flipId index created");

    await FlipHistory.collection.createIndex({ roomId: 1, flipNumber: 1 });
    console.log("  ✅ roomId + flipNumber compound index created");

    await FlipHistory.collection.createIndex(
      { matchedPlayer: 1 },
      { sparse: true }
    );
    console.log("  ✅ matchedPlayer index created");

    await FlipHistory.collection.createIndex({ timestamp: -1 });
    console.log("  ✅ timestamp (desc) index created");

    console.log("✅ FlipHistory indexes created successfully\n");
  } catch (error) {
    console.error("❌ Error creating FlipHistory indexes:", error);
    throw error;
  }
}

/**
 * Create indexes for GameResult collection
 * As per Section 7.5 of schema documentation
 */
async function createGameResultIndexes() {
  console.log("📊 Creating GameResult indexes...");

  try {
    await GameResult.collection.createIndex(
      { resultId: 1 },
      { unique: true, sparse: true }
    );
    console.log("  ✅ resultId index created");

    await GameResult.collection.createIndex({ roomId: 1 }, { unique: true });
    console.log("  ✅ roomId (unique) index created");

    await GameResult.collection.createIndex({ endedAt: -1 });
    console.log("  ✅ endedAt (desc) index created");

    await GameResult.collection.createIndex({ "standings.userId": 1 });
    console.log("  ✅ standings.userId index created");

    await GameResult.collection.createIndex({ gameMode: 1, endedAt: -1 });
    console.log("  ✅ gameMode + endedAt (desc) compound index created");

    console.log("✅ GameResult indexes created successfully\n");
  } catch (error) {
    console.error("❌ Error creating GameResult indexes:", error);
    throw error;
  }
}

/**
 * Create indexes for CriticalError collection
 * As per Section 7.6 of schema documentation
 */
async function createCriticalErrorIndexes() {
  console.log("📊 Creating CriticalError indexes...");

  try {
    await CriticalError.collection.createIndex(
      { errorId: 1 },
      { unique: true, sparse: true }
    );
    console.log("  ✅ errorId index created");

    await CriticalError.collection.createIndex({ errorType: 1, timestamp: -1 });
    console.log("  ✅ errorType + timestamp (desc) compound index created");

    await CriticalError.collection.createIndex({ roomId: 1 }, { sparse: true });
    console.log("  ✅ roomId index created");

    await CriticalError.collection.createIndex({ resolved: 1 });
    console.log("  ✅ resolved index created");

    await CriticalError.collection.createIndex({ timestamp: -1 });
    console.log("  ✅ timestamp (desc) index created");

    console.log("✅ CriticalError indexes created successfully\n");
  } catch (error) {
    console.error("❌ Error creating CriticalError indexes:", error);
    throw error;
  }
}

/**
 * Create indexes for BotActivity collection
 * As per Section 7.7 of schema documentation
 */
async function createBotActivityIndexes() {
  console.log("📊 Creating BotActivity indexes...");

  try {
    await BotActivity.collection.createIndex({ botId: 1 }, { unique: true });
    console.log("  ✅ botId (unique) index created");

    await BotActivity.collection.createIndex({ roomId: 1 });
    console.log("  ✅ roomId index created");

    await BotActivity.collection.createIndex({ replacedPlayer: 1 });
    console.log("  ✅ replacedPlayer index created");

    console.log("✅ BotActivity indexes created successfully\n");
  } catch (error) {
    console.error("❌ Error creating BotActivity indexes:", error);
    throw error;
  }
}

/**
 * List all indexes for a collection
 */
async function listIndexes(collectionName: string) {
  const collection = mongoose.connection.collection(collectionName);
  const indexes = await collection.indexes();

  console.log(`📋 Indexes for ${collectionName}:`);
  indexes.forEach((index) => {
    console.log(
      `  - ${JSON.stringify(index.key)} ${index.unique ? "(unique)" : ""} ${
        index.expireAfterSeconds ? `(TTL: ${index.expireAfterSeconds}s)` : ""
      }`
    );
  });
  console.log("");
}

/**
 * Drop all indexes for a collection (except _id)
 * Use with caution!
 */
async function dropAllIndexes(collectionName: string) {
  console.log(`⚠️  Dropping all indexes for ${collectionName}...`);

  try {
    const collection = mongoose.connection.collection(collectionName);
    await collection.dropIndexes();
    console.log(`✅ All indexes dropped for ${collectionName}\n`);
  } catch (error) {
    console.error(`❌ Error dropping indexes for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Main setup function
 */
export async function setupDatabaseIndexes() {
  console.log("🚀 Starting database index setup...\n");

  try {
    // Ensure MongoDB connection is established
    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        "MongoDB is not connected. Please connect before setting up indexes."
      );
    }

    // Create indexes for all collections
    await createUserIndexes();
    await createRoomIndexes();
    await createTransactionIndexes();
    await createFlipHistoryIndexes();
    await createGameResultIndexes();
    await createCriticalErrorIndexes();
    await createBotActivityIndexes();

    console.log("✅ All database indexes created successfully!\n");

    // List all indexes
    console.log("📋 Final index summary:\n");
    await listIndexes("users");
    await listIndexes("rooms");
    await listIndexes("transactions");
    await listIndexes("fliphistories");
    await listIndexes("gameresults");
    await listIndexes("criticalerrors");
    await listIndexes("botactivities");

    return true;
  } catch (error) {
    console.error("❌ Error setting up database indexes:", error);
    throw error;
  }
}

/**
 * Rebuild indexes (drop and recreate)
 * Use with caution in production!
 */
export async function rebuildIndexes() {
  console.log("🔄 Rebuilding all indexes...\n");

  try {
    // Drop existing indexes
    await dropAllIndexes("users");
    await dropAllIndexes("rooms");
    await dropAllIndexes("transactions");
    await dropAllIndexes("fliphistories");
    await dropAllIndexes("gameresults");
    await dropAllIndexes("criticalerrors");
    await dropAllIndexes("botactivities");

    // Recreate indexes
    await setupDatabaseIndexes();

    console.log("✅ Indexes rebuilt successfully!\n");
    return true;
  } catch (error) {
    console.error("❌ Error rebuilding indexes:", error);
    throw error;
  }
}

/**
 * Check index status
 */
export async function checkIndexStatus() {
  console.log("🔍 Checking index status...\n");

  try {
    await listIndexes("users");
    await listIndexes("rooms");
    await listIndexes("transactions");
    await listIndexes("fliphistories");
    await listIndexes("gameresults");
    await listIndexes("criticalerrors");
    await listIndexes("botactivities");

    console.log("✅ Index status check complete\n");
    return true;
  } catch (error) {
    console.error("❌ Error checking index status:", error);
    throw error;
  }
}

// CLI Script Runner
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      // Connect to MongoDB
      const mongoUri =
        process.env.MONGO_URI || "mongodb://localhost:27017/cardgame";
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected\n");

      switch (command) {
        case "setup":
          await setupDatabaseIndexes();
          break;
        case "rebuild":
          await rebuildIndexes();
          break;
        case "check":
          await checkIndexStatus();
          break;
        default:
          console.log(
            "Usage: ts-node src/config/indexes.ts [setup|rebuild|check]"
          );
          console.log("");
          console.log("Commands:");
          console.log("  setup   - Create all indexes (safe, skips existing)");
          console.log("  rebuild - Drop and recreate all indexes (CAUTION!)");
          console.log("  check   - List all current indexes");
          process.exit(1);
      }

      await mongoose.disconnect();
      console.log("✅ MongoDB disconnected");
      process.exit(0);
    } catch (error) {
      console.error("❌ Fatal error:", error);
      await mongoose.disconnect();
      process.exit(1);
    }
  })();
}
