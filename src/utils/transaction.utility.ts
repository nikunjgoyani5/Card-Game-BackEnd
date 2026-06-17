import mongoose from "mongoose";

/**
 * Transaction Utility
 *
 * Provides MongoDB transaction support with automatic fallback for non-replica-set environments.
 *
 * Usage:
 * ```typescript
 * const result = await withTransaction(async (session) => {
 *   await Model.create([data], { session });
 *   await Model.updateOne(filter, update, { session });
 *   return result;
 * });
 * ```
 */

let isReplicaSet: boolean | null = null;

/**
 * Check if MongoDB is running as a replica set
 */
async function checkReplicaSet(): Promise<boolean> {
  if (isReplicaSet !== null) {
    return isReplicaSet;
  }

  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      isReplicaSet = false;
      return false;
    }

    const serverStatus = await admin.serverStatus();
    isReplicaSet = serverStatus?.repl !== undefined;

    if (!isReplicaSet) {
      console.warn(
        "⚠️  MongoDB is not running as a replica set. Transactions will be disabled.\n" +
          "   For development with transactions, run: npm run mongodb:replica-set\n" +
          "   For production, ensure MongoDB is configured as a replica set."
      );
    }

    return isReplicaSet;
  } catch (error) {
    console.warn("Failed to check replica set status:", error);
    isReplicaSet = false;
    return false;
  }
}

/**
 * Execute a function with MongoDB transaction support
 *
 * If replica set is available, wraps operations in a transaction.
 * If not available (standalone MongoDB), executes without transaction.
 *
 * @param callback - Function to execute with optional session
 * @returns Result from callback
 */
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  const hasReplicaSet = await checkReplicaSet();

  if (!hasReplicaSet) {
    // No replica set - execute without transaction
    return await callback(null);
  }

  // Replica set available - use transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Create a session-aware model operation options object
 *
 * @param session - MongoDB session (can be null)
 * @returns Options object with session if available
 */
export function sessionOptions(session: mongoose.ClientSession | null) {
  return session ? { session } : {};
}

/**
 * Reset the replica set check cache (useful for testing)
 */
export function resetReplicaSetCheck() {
  isReplicaSet = null;
}

/**
 * Manually set replica set status (useful for testing)
 */
export function setReplicaSetStatus(status: boolean) {
  isReplicaSet = status;
}

export default withTransaction;
