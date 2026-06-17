import leaderboardService from "../modules/leaderboard/leaderboard.service";

/**
 * Background job to update leaderboards
 * Runs every hour
 */
class LeaderboardScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.log("⚠️ Leaderboard scheduler already running");
      return;
    }

    console.log("🚀 Starting leaderboard scheduler...");

    // Run immediately on startup
    this.runUpdate();

    // Schedule to run every hour (3600000 ms)
    this.intervalId = setInterval(() => {
      this.runUpdate();
    }, 3600000); // 1 hour

    console.log("✅ Leaderboard scheduler started (runs every hour)");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("🛑 Leaderboard scheduler stopped");
    }
  }

  /**
   * Run the leaderboard update
   */
  private async runUpdate(): Promise<void> {
    try {
      console.log(`🔄 [${new Date().toISOString()}] Updating leaderboards...`);
      await leaderboardService.updateAllLeaderboards();
      console.log(
        `✅ [${new Date().toISOString()}] Leaderboards updated successfully`
      );
    } catch (error: any) {
      console.error(
        `❌ [${new Date().toISOString()}] Error updating leaderboards:`,
        error
      );
    }
  }

  /**
   * Manually trigger an update
   */
  async triggerUpdate(): Promise<void> {
    await this.runUpdate();
  }
}

export default new LeaderboardScheduler();
