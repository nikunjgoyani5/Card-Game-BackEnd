/**
 * Flip Timer Utility
 *
 * Manages 3-second countdown timers for card flips.
 * Auto-flips when timer expires.
 */

import { DEFAULT_TIMER_MS } from "./constants.utility";

class FlipTimer {
  private timerId: NodeJS.Timeout | null = null;
  private roomId: string;
  private onExpire: (roomId: string) => Promise<void>;

  constructor(roomId: string, onExpire: (roomId: string) => Promise<void>) {
    this.roomId = roomId;
    this.onExpire = onExpire;
  }

  /**
   * Start timer for next flip
   * @param duration Duration in milliseconds (default: 3000ms = 3 seconds)
   */
  startTimer(duration: number = DEFAULT_TIMER_MS): void {
    // Clear any existing timer
    this.stopTimer();

    this.timerId = setTimeout(async () => {
      console.log(
        `⏰ Timer expired for room ${this.roomId} - executing auto flip`
      );
      try {
        await this.onExpire(this.roomId);
      } catch (error) {
        console.error(
          `Failed to execute auto flip for room ${this.roomId}:`,
          error
        );
      }
    }, duration);
  }

  /**
   * Stop current timer
   */
  stopTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Reset timer with new duration (used when flip request is made)
   * @param duration Duration in milliseconds (default: 5000ms = 5 seconds)
   */
  resetTimer(duration: number = 5000): void {
    this.stopTimer();
    this.startTimer(duration);
  }

  /**
   * Check if timer is currently active
   */
  isActive(): boolean {
    return this.timerId !== null;
  }
}

/**
 * Global timer manager for all active games
 */
class GameTimerManager {
  private timers: Map<string, FlipTimer> = new Map();

  /**
   * Create and start a timer for a room
   */
  startTimer(
    roomId: string,
    duration: number = DEFAULT_TIMER_MS,
    onExpire: (roomId: string) => Promise<void>
  ): void {
    // Stop existing timer if any
    this.stopTimer(roomId);

    // Create new timer
    const timer = new FlipTimer(roomId, onExpire);
    timer.startTimer(duration);
    this.timers.set(roomId, timer);
  }

  /**
   * Stop timer for a room
   */
  stopTimer(roomId: string): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      timer.stopTimer();
      this.timers.delete(roomId);
    }
  }

  /**
   * Reset timer for a room
   */
  resetTimer(roomId: string, duration: number = 5000): void {
    const timer = this.timers.get(roomId);
    if (timer) {
      timer.resetTimer(duration);
    }
  }

  /**
   * Get timer for a room
   */
  getTimer(roomId: string): FlipTimer | undefined {
    return this.timers.get(roomId);
  }

  /**
   * Check if room has active timer
   */
  hasTimer(roomId: string): boolean {
    return this.timers.has(roomId);
  }

  /**
   * Clean up all timers (for graceful shutdown)
   */
  stopAllTimers(): void {
    for (const [roomId, timer] of this.timers.entries()) {
      timer.stopTimer();
    }
    this.timers.clear();
  }
}

// Export singleton instance
export const gameTimers = new GameTimerManager();

export default FlipTimer;
