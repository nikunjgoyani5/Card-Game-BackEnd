import Redis from "ioredis";

// Create Redis client
const redis = new Redis(
  process.env.REDIS_URL ||
    "redis://default:M3Ax8aSWo1lPvje5TiFMy6RVdEjb6F1U@redis-18869.crce262.us-east-1-1.ec2.cloud.redislabs.com:18869",
  {
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  }
);

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

redis.on("ready", () => {
  console.log("✅ Redis is ready");
});

export default redis;
