import UserModel from "../models/User.model";
import User from "../models/User.model";
import bcrypt from "bcryptjs";
import { USER_TYPE } from "./constants.utility";

/**
 * Generates a unique username based on the provided name.
 * If the username already exists, appends a small random number to ensure uniqueness.
 * @param {string} name - The base name to generate the username from.
 * @returns {Promise<string>} - A unique username.
 */
export const generateUniqueUsername = async (name: string): Promise<string> => {
  let baseUsername = name.toLowerCase().replace(/\s+/g, "").slice(0, 15); // Remove spaces and limit length
  let username = baseUsername;
  let isUnique = false;
  let attempt = 0;

  while (!isUnique) {
    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      isUnique = true;
    } else {
      attempt++;
      const randomSuffix = String(Math.floor(Math.random() * 99) + 1).padStart(
        2,
        "0"
      ); // Generate 01-99
      username = `${baseUsername}${randomSuffix}`;
    }
  }

  return username;
};

export const ensureAdminExists = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const existingAdmin = await UserModel.findOne({ email: adminEmail });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || "Admin@123",
      10
    );
    const username = await generateUniqueUsername("admin");
    await UserModel.create({
      email: adminEmail,
      password: hashed,
      name: "Admin",
      username: username,
      role: USER_TYPE.ADMIN,
    });
    console.log("Admin user created successfully.");
  } else {
    console.log("Admin user already exists.");
  }
};
