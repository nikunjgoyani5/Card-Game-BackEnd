import mongoose from "mongoose";
import express from "express";
import { ensureAdminExists } from "../utils/user.utility";

const dbUrl: string = process.env.MONGO_URI || "";

const mongooseConnection = express();

mongoose.set("strictQuery", true);
mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("Message Database successfully connected.");
    ensureAdminExists();
  })
  .catch((err) => console.log("Message Database Connection Error==>", err));

export { mongooseConnection };
