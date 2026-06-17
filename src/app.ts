import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import routes from "./routes/index";
import { handleError } from "./utils/errorHandler.utility";
import dotenv from "dotenv";
import { setupSwagger } from "./utils/swagger";
dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "../public")));

// health check endpoint - defined before routes to ensure it's always available
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/v1", routes);

// global error handler
app.use(handleError);

setupSwagger(app);

export default app;
