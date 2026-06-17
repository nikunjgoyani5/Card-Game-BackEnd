import mongoose from "mongoose";

export class MongoService {
  private static instance: MongoService;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): MongoService {
    if (!MongoService.instance) {
      MongoService.instance = new MongoService();
    }
    return MongoService.instance;
  }

  async connect(uri?: string): Promise<void> {
    if (this.isConnected) {
      console.log("✅ MongoDB already connected");
      return;
    }

    const mongoUri = uri || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not set");
    }

    try {
      await mongoose.connect(mongoUri);
      this.isConnected = true;
      console.log("🟢 MongoDB connected");
      MongoUtility.onConnectionError((error) => {
        console.error("MongoDB connection error:", error);
      });

      MongoUtility.onDisconnected(() => {
        console.log("MongoDB disconnected");
      });
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("🔴 MongoDB disconnected");
    } catch (error) {
      console.error("❌ MongoDB disconnection error:", error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  onConnectionError(callback: (error: Error) => void): void {
    mongoose.connection.on("error", callback);
  }

  onDisconnected(callback: () => void): void {
    mongoose.connection.on("disconnected", callback);
  }

  onReconnected(callback: () => void): void {
    mongoose.connection.on("reconnected", callback);
  }
}

// Export singleton instance
export const MongoUtility = MongoService.getInstance();
