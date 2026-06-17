import mongoose, { Types, Document, ObjectId } from "mongoose";
import { USER_TYPE, UserType, WALLET_TYPE } from "../utils/constants.utility";

// Define Wallet interface
export interface IWallet {
  // Real Money
  realMoneyBalance: number;
  realMoneyLocked: number;
  realMoneyTotalDeposited: number;
  realMoneyTotalWithdrawn: number;

  // Free Coins
  coinBalance: number;
  coinLocked: number;
  coinTotalEarned: number;

  // Metadata
  lastUpdated: Date;
  version: number;
}

// Define SSN interface
export interface ISSN {
  encrypted: string; // AES-256 encrypted
  last4: string; // Last 4 digits for display
  iv: string; // Initialization vector
}

// Define User interface
export interface IUser extends Document {
  userId?: string; // Unique user ID (optional, defaults to _id)
  username: string;
  email: string;
  phone: string;

  // Personal Information
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  dateOfBirth?: Date;
  ssn?: ISSN;

  // Location
  location: string;
  country?: string;
  state: string;
  street: string;
  city: string;
  zipcode: string;

  // Authentication
  password: string;
  googleId?: string;
  tokenVersion: number;

  // Wallet & Game
  wallet: IWallet;
  lastSelectedMode?: string;

  // Social
  role: UserType;
  friends: ObjectId[];
  friendRequests: ObjectId[];

  // Status
  accountStatus?: "ACTIVE" | "SUSPENDED" | "BANNED";
  bannedUntil?: Date; // When temporary ban expires

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const WalletSchema = new mongoose.Schema<IWallet>(
  {
    realMoneyBalance: { type: Number, default: 0 },
    realMoneyLocked: { type: Number, default: 0 },
    realMoneyTotalDeposited: { type: Number, default: 0 },
    realMoneyTotalWithdrawn: { type: Number, default: 0 },
    coinBalance: { type: Number, default: 0 },
    coinLocked: { type: Number, default: 0 },
    coinTotalEarned: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    version: { type: Number, default: 0 },
  },
  { _id: false }
);

const SSNSchema = new mongoose.Schema<ISSN>(
  {
    encrypted: { type: String, required: true },
    last4: { type: String, required: true },
    iv: { type: String, required: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema<IUser>(
  {
    userId: { type: String, unique: true, sparse: true }, // Optional, defaults to _id.toString()
    username: { type: String, required: true, unique: true },
    email: { type: String, unique: true },
    phone: { type: String },

    // Personal Information
    firstName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: Date },
    ssn: { type: SSNSchema },

    // Location
    location: { type: String },
    country: { type: String },
    state: { type: String },
    street: { type: String },
    city: { type: String },
    zipcode: { type: String },

    // Authentication
    password: { type: String, required: true, select: false },
    googleId: { type: String },
    tokenVersion: { type: Number, default: 0 },

    // Wallet & Game
    wallet: { type: WalletSchema, default: () => ({}) },
    lastSelectedMode: {
      type: String,
      enum: [WALLET_TYPE.FREE_COIN, WALLET_TYPE.REAL_MONEY],
    },

    // Social
    role: {
      type: String,
      enum: Object.values(USER_TYPE),
      default: USER_TYPE.USER,
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Status
    accountStatus: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "BANNED"],
      default: "ACTIVE",
    },
    bannedUntil: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes as per section 7.1
UserSchema.index({ userId: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ "ssn.last4": 1 });
UserSchema.index({ accountStatus: 1 });

export default mongoose.model<IUser>("User", UserSchema);
