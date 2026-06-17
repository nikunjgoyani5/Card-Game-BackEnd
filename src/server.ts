import dotenv from "dotenv";
import app from "./app";
import { mongooseConnection } from "./config/connection";
import { httpServer } from "./socket";
import leaderboardScheduler from "./utils/leaderboardScheduler.utility";
dotenv.config();

app.use(mongooseConnection);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Start leaderboard scheduler
  leaderboardScheduler.start();
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server...");
  leaderboardScheduler.stop();
  httpServer.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Closing server...");
  leaderboardScheduler.stop();
  httpServer.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
