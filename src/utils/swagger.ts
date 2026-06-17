// src/utils/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { MESSAGES } from "./constants.utility";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CardGame API",
      version: "1.0.0",
      description: "API documentation for the CardGame backend",
    },

    servers: [
      {
        url: "http://localhost:5000/api/v1",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    paths: {
      // ----------------------------------------------------------------------
      // AUTH ROUTES
      // ----------------------------------------------------------------------

      "/auth/register": {
        post: {
          summary: "Register a new user",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    email: { type: "string" },
                    location: { type: "string" },
                    state: { type: "string" },
                    phone: { type: "string" },
                    street: { type: "string" },
                    city: { type: "string" },
                    zipcode: { type: "string" },
                    password: { type: "string" },
                    confirmPassword: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: MESSAGES.REGISTER_SUCCESS,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      user: { type: "object" },
                    },
                  },
                },
              },
            },
            500: { description: MESSAGES.BAD_REQUEST },
          },
        },
      },

      "/auth/login": {
        post: {
          summary: "Login user",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: MESSAGES.LOGIN_SUCCESS,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      user: { type: "object" },
                    },
                  },
                },
              },
            },
            500: { description: MESSAGES.BAD_REQUEST },
          },
        },
      },

      "/auth/profile": {
        get: {
          summary: "Get logged-in user profile",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: MESSAGES.PROFILE_GET_SUCCESS },
            401: { description: "Unauthorized – Token Missing/Invalid" },
            500: { description: MESSAGES.BAD_REQUEST },
          },
        },

        put: {
          summary: "Update logged-in user profile",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    location: { type: "string" },
                    state: { type: "string" },
                    phone: { type: "string" },
                    street: { type: "string" },
                    city: { type: "string" },
                    zipcode: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: MESSAGES.PROFILE_UPDATE_SUCCESS },
            500: { description: MESSAGES.BAD_REQUEST },
          },
        },
      },

      "/auth/logout": {
        post: {
          summary: "Logout user",
          tags: ["Auth"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: MESSAGES.LOGOUT_SUCCESS },
            401: { description: "Unauthorized" },
            500: { description: MESSAGES.BAD_REQUEST },
          },
        },
      },

      // ----------------------------------------------------------------------
      // ROOM ROUTES (Added per your request)
      // ----------------------------------------------------------------------
      "/room/public": {
        get: {
          summary: "Public rooms list",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "walletType",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["free", "real"],
              },
              description: "Optional wallet type filter",
            },
          ],
          responses: {
            200: { description: "Public rooms retrieved successfully" },
            400: { description: "Bad request" },
          },
        },
      },
      "/room/{id}": {
        get: {
          summary: "Retrieve a specific room by ID",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
              description: "Unique identifier of the room to retrieve",
            },
          ],
          responses: {
            200: {
              description: "Room retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      code: { type: "string" },
                      isPrivate: { type: "boolean" },
                      deck: { type: "number" },
                      stake: { type: "number" },
                      maxPlayers: { type: "number" },
                      walletType: { type: "string" },
                      startDate: { type: "string", format: "date-time" },
                      status: { type: "string" },
                    },
                  },
                },
              },
            },
            400: { description: "Bad request" },
          },
        },
      },
      "/room": {
        post: {
          summary: "Create a new room (legacy endpoint)",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    roomType: {
                      type: "string",
                      enum: ["PUBLIC", "PRIVATE"],
                      default: "PUBLIC",
                    },
                    gameLength: {
                      type: "number",
                      enum: [26, 52],
                      default: 52,
                    },
                    maxPlayers: {
                      type: "number",
                      enum: [2, 4, 13],
                      default: 4,
                    },
                    betMultiplier: {
                      type: "number",
                      minimum: 1,
                      default: 1,
                    },
                    baseBetAmount: {
                      type: "number",
                      minimum: 25,
                      default: 25,
                    },
                    scheduledStartTime: {
                      type: "string",
                      format: "date-time",
                      description: "Optional scheduled start (ISO 8601 format)",
                    },
                    isPrivate: { type: "boolean", description: "Legacy field" },
                    deck: { type: "number", description: "Legacy field" },
                    stake: { type: "number", description: "Legacy field" },
                    walletType: {
                      type: "string",
                      enum: ["FREE_COIN", "REAL_MONEY"],
                      description: "Legacy field",
                    },
                  },
                  required: ["gameLength", "maxPlayers", "betMultiplier"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Room created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          room: {
                            type: "object",
                            properties: {
                              _id: { type: "string" },
                              roomCode: { type: "string" },
                              roomType: { type: "string" },
                              gameMode: { type: "string" },
                              gameLength: { type: "number" },
                              maxPlayers: { type: "number" },
                              currentPlayers: { type: "number" },
                              entryFee: { type: "number" },
                              maxWinningAmount: { type: "number" },
                              status: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      code: {
                        type: "string",
                        enum: [
                          "ROOM_001",
                          "ROOM_002",
                          "ROOM_003",
                          "WALLET_001",
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/room/create": {
        post: {
          summary: "Create a new game room",
          description:
            "Create a public or private room with specified game parameters. Entry fee is automatically calculated.",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    roomType: {
                      type: "string",
                      enum: ["PUBLIC", "PRIVATE"],
                      default: "PUBLIC",
                      description: "Room visibility type",
                    },
                    gameLength: {
                      type: "number",
                      enum: [26, 52],
                      description: "Number of rounds (26 or 52)",
                    },
                    maxPlayers: {
                      type: "number",
                      enum: [2, 4, 13],
                      description: "Maximum players allowed",
                    },
                    betMultiplier: {
                      type: "number",
                      minimum: 1,
                      description: "Bet multiplier (1x, 2x, 3x, 5x, 10x, etc.)",
                    },
                    baseBetAmount: {
                      type: "number",
                      minimum: 25,
                      default: 25,
                      description: "Base bet amount (minimum $25)",
                    },
                    scheduledStartTime: {
                      type: "string",
                      format: "date-time",
                      description: "Optional scheduled start time (ISO 8601)",
                    },
                  },
                  required: ["gameLength", "maxPlayers", "betMultiplier"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Room created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          room: {
                            type: "object",
                            properties: {
                              roomId: { type: "string" },
                              roomCode: {
                                type: "string",
                                description: "6-char code (PRIVATE rooms only)",
                              },
                              gameMode: {
                                type: "string",
                                enum: ["FREE_COIN", "REAL_MONEY"],
                              },
                              roomType: { type: "string" },
                              gameLength: { type: "number" },
                              maxPlayers: { type: "number" },
                              currentPlayers: { type: "number" },
                              entryFee: {
                                type: "number",
                                description:
                                  "(gameLength * betMultiplier) / maxPlayers",
                              },
                              maxWinningAmount: {
                                type: "number",
                                description: "baseBetAmount * betMultiplier",
                              },
                              status: { type: "string" },
                              hostId: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      code: {
                        type: "string",
                        enum: [
                          "ROOM_001",
                          "ROOM_002",
                          "ROOM_003",
                          "WALLET_001",
                          "ROOM_010",
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/room/join": {
        post: {
          summary: "Join a room (matchmaking, room code, or invitation)",
          description:
            "Join a room using matchmaking (auto-create if no match), room code, or invitation token. Supports 60-second matchmaking timeout.",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    joinMethod: {
                      type: "string",
                      enum: ["MATCHMAKING", "ROOM_CODE", "INVITATION"],
                      description: "Method to join room",
                    },
                    roomCode: {
                      type: "string",
                      minLength: 6,
                      maxLength: 6,
                      description: "6-char room code (required for ROOM_CODE)",
                    },
                    invitationToken: {
                      type: "string",
                      description:
                        "JWT invitation token (required for INVITATION)",
                    },
                    gameLength: {
                      type: "number",
                      enum: [26, 52],
                      description: "Required for MATCHMAKING",
                    },
                    betMultiplier: {
                      type: "number",
                      minimum: 1,
                      description: "Required for MATCHMAKING",
                    },
                    maxPlayers: {
                      type: "number",
                      enum: [2, 4, 13],
                      description: "Optional for MATCHMAKING (default: 13)",
                    },
                  },
                  required: ["joinMethod"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Joined room or matchmaking started",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      {
                        type: "object",
                        description: "Matchmaking response",
                        properties: {
                          success: { type: "boolean" },
                          status: {
                            type: "string",
                            enum: ["WAITING_FOR_PLAYERS"],
                          },
                          message: { type: "string" },
                          timeoutIn: {
                            type: "number",
                            description: "Seconds until timeout (60)",
                          },
                          data: {
                            type: "object",
                            properties: {
                              roomId: { type: "string" },
                              gameMode: { type: "string" },
                              currentPlayers: { type: "number" },
                              maxPlayers: { type: "number" },
                            },
                          },
                        },
                      },
                      {
                        type: "object",
                        description: "Direct room join",
                        properties: {
                          success: { type: "boolean" },
                          data: {
                            type: "object",
                            properties: {
                              room: {
                                type: "object",
                                properties: {
                                  roomId: { type: "string" },
                                  gameMode: { type: "string" },
                                  status: { type: "string" },
                                  currentPlayers: { type: "number" },
                                  maxPlayers: { type: "number" },
                                  players: { type: "array" },
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      code: {
                        type: "string",
                        enum: [
                          "ROOM_004",
                          "ROOM_005",
                          "ROOM_006",
                          "ROOM_007",
                          "ROOM_008",
                          "ROOM_009",
                          "ROOM_012",
                          "WALLET_001",
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/room/schedule": {
        post: {
          summary: "Schedule a future game",
          description:
            "Create a scheduled room for a future time. Optionally invite friends.",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    roomType: {
                      type: "string",
                      enum: ["PUBLIC", "PRIVATE"],
                      default: "PRIVATE",
                    },
                    gameLength: { type: "number", enum: [26, 52] },
                    maxPlayers: { type: "number", enum: [2, 4, 13] },
                    betMultiplier: { type: "number", minimum: 1 },
                    baseBetAmount: { type: "number", minimum: 25, default: 25 },
                    scheduledStartTime: {
                      type: "string",
                      format: "date-time",
                      description: "Future start time (ISO 8601)",
                    },
                    inviteFriends: {
                      type: "array",
                      items: { type: "string" },
                      description: "Array of user IDs to invite",
                    },
                  },
                  required: [
                    "roomType",
                    "gameLength",
                    "maxPlayers",
                    "betMultiplier",
                    "scheduledStartTime",
                  ],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Room scheduled successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          room: {
                            type: "object",
                            properties: {
                              roomId: { type: "string" },
                              roomCode: { type: "string" },
                              scheduledStartTime: {
                                type: "string",
                                format: "date-time",
                              },
                              isScheduled: { type: "boolean" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      code: { type: "string", enum: ["ROOM_010"] },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/room/list": {
        get: {
          summary: "List available rooms for matchmaking",
          description:
            "Get a list of public rooms matching specified criteria.",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "gameMode",
              in: "query",
              schema: { type: "string", enum: ["FREE_COIN", "REAL_MONEY"] },
            },
            {
              name: "gameLength",
              in: "query",
              schema: { type: "number", enum: [26, 52] },
            },
            {
              name: "betMultiplier",
              in: "query",
              schema: { type: "number", minimum: 1 },
            },
            {
              name: "maxPlayers",
              in: "query",
              schema: { type: "number", enum: [2, 4, 13] },
            },
          ],
          responses: {
            200: {
              description: "Rooms retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          rooms: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                roomId: { type: "string" },
                                gameLength: { type: "number" },
                                maxPlayers: { type: "number" },
                                currentPlayers: { type: "number" },
                                entryFee: { type: "number" },
                                maxWinningAmount: { type: "number" },
                                status: { type: "string" },
                              },
                            },
                          },
                          total: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/room/start": {
        post: {
          summary: "Start a game in the room",
          tags: ["Room"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    roomId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Game started successfully" },
            400: { description: "Bad request" },
          },
        },
      },

      // ----------------------------------------------------------------------
      // WALLET ROUTES
      // ----------------------------------------------------------------------
      "/wallet": {
        get: {
          summary: "Get wallet balance",
          tags: ["Wallet"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Wallet balance retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          realMoney: {
                            type: "object",
                            properties: {
                              available: { type: "number" },
                              locked: { type: "number" },
                              total: { type: "number" },
                              totalDeposited: { type: "number" },
                              totalWithdrawn: { type: "number" },
                            },
                          },
                          coins: {
                            type: "object",
                            properties: {
                              available: { type: "number" },
                              locked: { type: "number" },
                              total: { type: "number" },
                              totalEarned: { type: "number" },
                            },
                          },
                          lastUpdated: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/wallet/lock-entry-fee": {
        post: {
          summary: "Lock entry fee for a game",
          tags: ["Wallet"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "number", description: "Amount to lock" },
                    gameMode: {
                      type: "string",
                      enum: ["FREE_COIN", "REAL_MONEY"],
                      description: "Game mode",
                    },
                    roomId: { type: "string", description: "Room ID" },
                  },
                  required: ["amount", "gameMode", "roomId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Entry fee locked successfully" },
            400: { description: "Bad request - WALLET_001/WALLET_006" },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/wallet/unlock-entry-fee": {
        post: {
          summary: "Unlock entry fee after game ends",
          tags: ["Wallet"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    amount: { type: "number", description: "Amount to unlock" },
                    gameMode: {
                      type: "string",
                      enum: ["FREE_COIN", "REAL_MONEY"],
                      description: "Game mode",
                    },
                    roomId: { type: "string", description: "Room ID" },
                  },
                  required: ["amount", "gameMode", "roomId"],
                },
              },
            },
          },
          responses: {
            200: { description: "Entry fee unlocked successfully" },
            400: { description: "Bad request - WALLET_002/WALLET_006" },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/wallet/buy-coins": {
        post: {
          summary: "Purchase coins with real money",
          tags: ["Wallet"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    packageId: {
                      type: "string",
                      enum: [
                        "COIN_PKG_1",
                        "COIN_PKG_5",
                        "COIN_PKG_10",
                        "COIN_PKG_20",
                      ],
                      description: "Coin package ID",
                    },
                  },
                  required: ["packageId"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Coins purchased successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          purchaseId: { type: "string" },
                          package: { type: "string" },
                          costUSD: { type: "number" },
                          coinsReceived: { type: "number" },
                          newCoinBalance: { type: "number" },
                          newRealMoneyBalance: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: "Bad request - WALLET_001/WALLET_003" },
            401: { description: "Unauthorized" },
            429: { description: "Too many requests" },
            500: { description: "Server error" },
          },
        },
      },

      "/wallet/ad-reward": {
        post: {
          summary: "Grant coins after watching ad",
          tags: ["Wallet"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    adId: { type: "string", description: "Ad ID" },
                    adRevenue: {
                      type: "number",
                      description: "Ad revenue in USD",
                    },
                  },
                  required: ["adId", "adRevenue"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Ad reward granted successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          coinsAwarded: { type: "number" },
                          newCoinBalance: { type: "number" },
                          adsWatchedToday: { type: "number" },
                          adsRemainingToday: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: "Bad request - WALLET_004/WALLET_005" },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      // ----------------------------------------------------------------------
      // MODE ROUTES
      // ----------------------------------------------------------------------
      "/modes/select": {
        post: {
          summary: "Select game mode",
          tags: ["Mode"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    mode: {
                      type: "string",
                      enum: ["FREE_COIN", "REAL_MONEY"],
                      description: "Game mode to select",
                    },
                  },
                  required: ["mode"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Game mode selected successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          mode: { type: "string" },
                          wallet: {
                            type: "object",
                            properties: {
                              balance: { type: "number" },
                              locked: { type: "number" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description:
                "Bad request - MODE_001 (invalid mode) or MODE_002 (cannot change in game)",
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/modes/current": {
        get: {
          summary: "Get current active mode",
          tags: ["Mode"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Current mode retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: {
                        type: "object",
                        properties: {
                          mode: { type: "string" },
                          inGame: { type: "boolean" },
                          wallet: {
                            type: "object",
                            properties: {
                              balance: { type: "number" },
                              locked: { type: "number" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            404: {
              description: "No mode selected - MODE_003",
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/modes/refresh": {
        post: {
          summary: "Refresh mode session (extend TTL)",
          tags: ["Mode"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Mode session refreshed successfully" },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      // ----------------------------------------------------------------------
      // FRIENDS ROUTES (Added per your request)
      // ----------------------------------------------------------------------
      "/friends/non-friends": {
        get: {
          summary: "List users who are not friends",
          tags: ["Friends"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "username",
              in: "query",
              required: false,
              schema: {
                type: "string",
              },
              description: "Filter users by username",
            },
          ],
          responses: {
            200: {
              description: "List of users who are not friends",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      users: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            username: { type: "string" },
                            email: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: { description: "Server error" },
          },
        },
      },

      "/friends/send-invite": {
        post: {
          summary: "Send a friend invite",
          tags: ["Friends"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    targetUserId: {
                      type: "string",
                      description: "ID of the user to invite",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Friend invite sent successfully" },
            500: { description: "Server error" },
          },
        },
      },

      "/friends/friends": {
        get: {
          summary: "List friends of the current user",
          tags: ["Friends"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "username",
              in: "query",
              required: false,
              schema: {
                type: "string",
              },
              description: "Filter friends by username",
            },
          ],
          responses: {
            200: {
              description: "List of friends",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      users: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            username: { type: "string" },
                            email: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: { description: "Server error" },
          },
        },
      },

      "/friends/friend-requests": {
        get: {
          summary: "List incoming friend requests",
          tags: ["Friends"],
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "List of incoming friend requests",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      users: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            username: { type: "string" },
                            email: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            500: { description: "Server error" },
          },
        },
      },

      "/friends/handle-request": {
        post: {
          summary: "Accept or reject a friend request",
          tags: ["Friends"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    requesterId: {
                      type: "string",
                      description: "ID of the user who sent the request",
                    },
                    action: {
                      type: "string",
                      enum: ["accept", "reject"],
                      description: "Action to perform",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Friend request handled successfully" },
            500: { description: "Server error" },
          },
        },
      },

      // ----------------------------------------------------------------------
      // GAME ROUTES (Feature 4: Game Setup & Card Distribution)
      // ----------------------------------------------------------------------

      "/game/start/{roomId}": {
        post: {
          summary: "Start game and distribute cards",
          tags: ["Game"],
          security: [{ bearerAuth: [] }],
          description: `
**Complete game setup flow:**

1. Validates room exists and is in WAITING status
2. Validates minimum 2 players
3. Verifies requester is room host (for manual start)
4. Creates standard 52-card deck
5. Shuffles deck using Fisher-Yates algorithm
6. Selects subset based on gameLength:
   - 52 rounds: Uses all 52 cards
   - 26 rounds: Randomly selects 26 cards
7. Distributes cards evenly to all players
8. Stores dealer deck in MongoDB (single source of truth)
9. Initializes game state in Redis (fast access)
10. Updates room status to IN_PROGRESS
11. Emits Socket.IO events (game_starting, cards_distributed, initial_state)

**Card Distribution Examples:**
- 52 rounds, 13 players: 4 cards each
- 26 rounds, 2 players: 13 cards each
- 52 rounds, 4 players: 13 cards each

**Security:**
- Only room host can manually start game
- Cards are private (each player receives only their cards)
- Dealer deck stored in backend only (never sent to clients)
- No card predictions possible

**Auto-Start:**
- Game auto-starts when room reaches maxPlayers
- 3-second countdown before card distribution
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
                example: "507f1f77bcf86cd799439011",
              },
            },
          ],
          responses: {
            200: {
              description: "Game started successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: {
                        type: "string",
                        example: "Game started successfully",
                      },
                      data: {
                        type: "object",
                        properties: {
                          room: {
                            type: "object",
                            properties: {
                              _id: { type: "string" },
                              code: { type: "string", example: "ABC123" },
                              roomType: {
                                type: "string",
                                enum: ["PUBLIC", "PRIVATE"],
                              },
                              gameMode: {
                                type: "string",
                                enum: ["FREE_COIN", "REAL_MONEY"],
                              },
                              gameLength: { type: "number", example: 52 },
                              maxPlayers: { type: "number", example: 4 },
                              currentPlayers: { type: "number", example: 4 },
                              betMultiplier: { type: "number", example: 10 },
                              entryFee: { type: "number", example: 130 },
                              maxWinningAmount: {
                                type: "number",
                                example: 250,
                              },
                              status: {
                                type: "string",
                                example: "IN_PROGRESS",
                              },
                              startedAt: {
                                type: "string",
                                format: "date-time",
                              },
                              players: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    userId: { type: "string" },
                                    username: { type: "string" },
                                    seat: { type: "number" },
                                    ready: { type: "boolean" },
                                    cardCount: { type: "number", example: 13 },
                                  },
                                },
                              },
                            },
                          },
                          cardsPerPlayer: {
                            type: "number",
                            example: 13,
                            description: "Number of cards each player receives",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: false },
                      error: { type: "string" },
                      code: { type: "string" },
                    },
                  },
                  examples: {
                    roomNotFound: {
                      value: {
                        success: false,
                        error: "Room not found",
                        code: "ROOM_005",
                      },
                    },
                    alreadyStarted: {
                      value: {
                        success: false,
                        error: "Game already in progress or ended",
                        code: "ROOM_008",
                      },
                    },
                    notEnoughPlayers: {
                      value: {
                        success: false,
                        error: "Minimum 2 players required to start",
                        code: "ROOM_013",
                      },
                    },
                    notHost: {
                      value: {
                        success: false,
                        error: "Only room host can manually start the game",
                        code: "GAME_004",
                      },
                    },
                    distributionError: {
                      value: {
                        success: false,
                        error:
                          "Cannot distribute 52 cards evenly among 3 players",
                        code: "GAME_001",
                      },
                    },
                    shuffleError: {
                      value: {
                        success: false,
                        error: "Error shuffling deck. Please try again.",
                        code: "GAME_002",
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized (no JWT token)" },
            500: { description: "Server error" },
          },
        },
      },

      "/game/{roomId}/state": {
        get: {
          summary: "Get current game state (for debugging)",
          tags: ["Game"],
          security: [{ bearerAuth: [] }],
          description: `
Returns complete game state including dealer deck and all player hands.

**For debugging purposes only** - In production, this endpoint should be restricted or removed.

Includes:
- Dealer deck (all cards in order)
- Player hands (all players' cards)
- Game metadata (length, max players, status)
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
              },
            },
          ],
          responses: {
            200: {
              description: "Game state retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          roomId: { type: "string" },
                          gameLength: { type: "number" },
                          maxPlayers: { type: "number" },
                          status: { type: "string" },
                          dealerDeck: {
                            type: "array",
                            items: { type: "string" },
                            example: ["AS", "KH", "QD", "JC", "10S"],
                          },
                          playerHands: {
                            type: "object",
                            additionalProperties: {
                              type: "array",
                              items: { type: "string" },
                            },
                            example: {
                              user1: ["AS", "KH", "QD"],
                              user2: ["JC", "10S", "9H"],
                            },
                          },
                          startedAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                      code: { type: "string" },
                    },
                  },
                  examples: {
                    roomNotFound: {
                      value: {
                        success: false,
                        error: "Room not found",
                        code: "ROOM_005",
                      },
                    },
                    gameNotInProgress: {
                      value: {
                        success: false,
                        error: "Game not in progress",
                        code: "GAME_003",
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/game/flip-request": {
        post: {
          summary: "Request to flip out of turn (bidding system)",
          tags: ["Game"],
          security: [{ bearerAuth: [] }],
          description: `
**Flip Request Bidding System**

Allows players to bid for the right to flip out of turn. Creates a competitive bidding system.

**Rules:**
- Only ONE flip request active at a time
- Higher bid replaces previous request (previous bid is refunded)
- Request expires after 5 seconds
- Payment goes to platform (deducted immediately)
- Timer resets to 5 seconds on new request
- After 5 seconds, highest bidder gets flip rights

**Minimum Bid Calculation:**
\`\`\`
minimumBid = (entryFee / totalCardsPerPlayer) * 0.10

Example:
- Entry fee: $40
- Cards per player: 4
- Minimum bid: ($40 / 4) * 0.10 = $1.00
\`\`\`

**No Maximum Bid:** Players can bid any amount above minimum.

**Workflow:**
1. Player submits bid
2. System validates bid ≥ minimum
3. Deducts bid from player's balance
4. If previous request exists and new bid is higher:
   - Refund previous requester
   - Replace with new request
5. Start 5-second countdown
6. After 5 seconds (if no higher bid):
   - Grant flip rights to highest bidder
   - Allow that player to flip next
          `,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    roomId: {
                      type: "string",
                      pattern: "^[0-9a-fA-F]{24}$",
                      description: "Room ID (MongoDB ObjectId)",
                      example: "507f1f77bcf86cd799439011",
                    },
                    bidAmount: {
                      type: "number",
                      minimum: 0.01,
                      description: "Bid amount (must be ≥ minimum bid)",
                      example: 5.0,
                    },
                  },
                  required: ["roomId", "bidAmount"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Flip request placed successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: {
                        type: "string",
                        example: "Flip request placed successfully",
                      },
                      data: {
                        type: "object",
                        properties: {
                          requestId: {
                            type: "string",
                            example: "req_xyz",
                          },
                          bidAmount: { type: "number", example: 5.0 },
                          expiresAt: {
                            type: "string",
                            format: "date-time",
                            example: "2025-12-07T10:30:05Z",
                          },
                          minimumNextBid: {
                            type: "number",
                            example: 5.1,
                            description: "Minimum bid to outbid this request",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                      code: { type: "string" },
                    },
                  },
                  examples: {
                    bidTooLow: {
                      value: {
                        success: false,
                        error: "Bid amount below minimum. Minimum: $1.00",
                        code: "FLIP_001",
                      },
                    },
                    bidNotHigher: {
                      value: {
                        success: false,
                        error: "Bid must be higher than current request: $5.00",
                        code: "FLIP_002",
                      },
                    },
                    notInGame: {
                      value: {
                        success: false,
                        error: "You are not in this game",
                        code: "FLIP_003",
                      },
                    },
                    insufficientBalance: {
                      value: {
                        success: false,
                        error: "Insufficient balance",
                        code: "WALLET_001",
                      },
                    },
                    flipInProgress: {
                      value: {
                        success: false,
                        error: "Another flip is in progress",
                        code: "GAME_005",
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/game/flip-request/{roomId}": {
        get: {
          summary: "Get active flip request for a room",
          tags: ["Game"],
          security: [{ bearerAuth: [] }],
          description: `
Returns the currently active flip request (if any) for a room.

Useful for:
- Displaying current bid to all players
- Showing countdown timer
- Allowing players to see minimum bid to outbid
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
              },
            },
          ],
          responses: {
            200: {
              description: "Active flip request retrieved (or null if none)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          activeRequest: {
                            oneOf: [
                              {
                                type: "object",
                                properties: {
                                  userId: { type: "string" },
                                  username: { type: "string" },
                                  bidAmount: { type: "number" },
                                  expiresAt: { type: "number" },
                                },
                              },
                              { type: "null" },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/game/{roomId}/scores": {
        get: {
          summary: "Get current game scores",
          tags: ["Game"],
          security: [{ bearerAuth: [] }],
          description: `
**Feature 7: Scoring & Round Rules**

Returns current scores for all players in an active game.

**Score Tracking:**
- Players start at score 0
- Scores increase on WIN rounds (when their card matches)
- Scores decrease on LOSS rounds (when their card matches)
- NO_CHANGE rounds don't affect scores
- Scores tracked internally during game
- Wallet balances NOT updated until game ends

**Round Rules:**
Each flip has a predefined rule:
- **WIN**: Player gains money (amount: 1-99)
- **LOSS**: Player loses money (amount: 1-99)
- **NO_CHANGE**: No financial impact (amount: 0)

**Example:**
\`\`\`
Round 1: "AS" flipped, rule: WIN $10, Player A has "AS"
→ Player A score: +10 → 10

Round 2: "KH" flipped, rule: LOSS $5, Player B has "KH"
→ Player B score: -5 → -5

Round 3: "QD" flipped, rule: WIN $15, No match
→ No score changes
\`\`\`

**Use Cases:**
- Live scoreboard display
- Progress tracking
- Leaderboard updates
- Final settlement calculation
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
              },
            },
          ],
          responses: {
            200: {
              description: "Game scores retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: {
                        type: "string",
                        example: "Game scores retrieved successfully",
                      },
                      data: {
                        type: "object",
                        properties: {
                          roomId: {
                            type: "string",
                            example: "507f1f77bcf86cd799439011",
                          },
                          currentFlip: {
                            type: "number",
                            example: 25,
                            description: "Current flip/round number",
                          },
                          totalFlips: {
                            type: "number",
                            example: 52,
                            description: "Total flips in game",
                          },
                          scores: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                userId: {
                                  type: "string",
                                  example: "user_123",
                                },
                                username: {
                                  type: "string",
                                  example: "Player1",
                                },
                                score: {
                                  type: "number",
                                  example: 150,
                                  description:
                                    "Current score (can be negative)",
                                },
                                cardsRemaining: {
                                  type: "number",
                                  example: 2,
                                  description: "Number of cards left",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                      code: { type: "string" },
                    },
                  },
                  examples: {
                    roomNotFound: {
                      value: {
                        success: false,
                        error: "Room not found",
                        code: "ROOM_005",
                      },
                    },
                    gameNotInProgress: {
                      value: {
                        success: false,
                        error: "Game not in progress",
                        code: "GAME_003",
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/game/{roomId}/cards": {
        get: {
          summary: "Get player's cards (for testing)",
          tags: ["Game"],
          security: [{ bearerAuth: [] }],
          description: `
Returns the authenticated player's cards for a given room.

Used for testing and debugging. In production gameplay, cards are distributed via Socket.IO events.
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
              },
            },
          ],
          responses: {
            200: {
              description: "Player cards retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          roomId: { type: "string" },
                          userId: { type: "string" },
                          cards: {
                            type: "array",
                            items: { type: "string" },
                            example: ["AS", "KH", "QD", "JC"],
                          },
                          cardCount: { type: "number", example: 4 },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                    },
                  },
                  examples: {
                    roomNotFound: {
                      value: { success: false, error: "Room not found" },
                    },
                    cardsNotDistributed: {
                      value: {
                        success: false,
                        error: "Cards not distributed yet",
                      },
                    },
                    notInGame: {
                      value: {
                        success: false,
                        error: "Player not in this game",
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      // ----------------------------------------------------------------------
      // FLIP ROUTES (Feature 5: Flip System & Real-Time Gameplay)
      // ----------------------------------------------------------------------

      "/flip/{roomId}": {
        post: {
          summary: "Execute player-initiated flip",
          tags: ["Flip"],
          security: [{ bearerAuth: [] }],
          description: `
Allows a player to manually trigger a flip (reveal next card).

**Flow:**
1. Validates player is in the room
2. Validates game is in progress
3. Stops current timer
4. Executes flip logic (reveals card, finds matching player, applies rule)
5. Updates scores and removes matched card
6. Logs flip to FlipHistory
7. Emits Socket.IO events to all players
8. Starts next flip timer or ends game

**Rules Applied:**
- WIN: Player gains points (5-50)
- LOSS: Player loses points (5-50)
- NO_CHANGE: No score change

**Critical Validation:**
- Every revealed card MUST match a player's hand
- If no match found, logs to CriticalError collection (GAME_013)
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
              },
            },
          ],
          responses: {
            200: {
              description: "Flip executed successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: {
                        type: "string",
                        example: "Flip executed successfully",
                      },
                      data: {
                        type: "object",
                        properties: {
                          flipNumber: { type: "number", example: 15 },
                          revealedCard: { type: "string", example: "AS" },
                          matchedPlayer: {
                            type: "string",
                            description: "User ID of matched player",
                          },
                          ruleApplied: {
                            type: "object",
                            properties: {
                              type: {
                                type: "string",
                                enum: ["WIN", "LOSS", "NO_CHANGE"],
                              },
                              amount: { type: "number", example: 25 },
                              description: {
                                type: "string",
                                example: "Win $25",
                              },
                            },
                          },
                          scoreChange: { type: "number", example: 25 },
                          newScore: { type: "number", example: 125 },
                          gameComplete: { type: "boolean", example: false },
                          nextFlipNumber: { type: "number", example: 16 },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                      code: { type: "string" },
                    },
                  },
                  examples: {
                    roomNotFound: {
                      value: {
                        success: false,
                        error: "Room not found",
                        code: "ROOM_005",
                      },
                    },
                    gameNotInProgress: {
                      value: {
                        success: false,
                        error: "Game not in progress",
                        code: "GAME_006",
                      },
                    },
                    allFlipsCompleted: {
                      value: {
                        success: false,
                        error: "All flips have been completed",
                        code: "GAME_003",
                      },
                    },
                    notYourTurn: {
                      value: {
                        success: false,
                        error: "Not your turn to flip",
                        code: "GAME_004",
                      },
                    },
                    flipInProgress: {
                      value: {
                        success: false,
                        error: "Another flip is in progress",
                        code: "GAME_005",
                      },
                    },
                    cardNotFound: {
                      value: {
                        success: false,
                        error: "Card not found in any player hand",
                        code: "GAME_013",
                      },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/flip/{roomId}/history": {
        get: {
          summary: "Get flip history for a room",
          tags: ["Flip"],
          security: [{ bearerAuth: [] }],
          description: `
Returns complete flip history for a game room.

Includes:
- All flips executed so far
- Cards revealed
- Players matched
- Rules applied
- Score changes
- Trigger source (MANUAL/AUTO)

Useful for:
- Game replay
- Score verification
- Debugging
- Statistics
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
              },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Number of records to return (default: 100)",
              schema: {
                type: "number",
                minimum: 1,
                maximum: 500,
                default: 100,
              },
            },
          ],
          responses: {
            200: {
              description: "Flip history retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          roomId: { type: "string" },
                          totalFlips: { type: "number", example: 15 },
                          history: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                flipNumber: { type: "number" },
                                revealedCard: { type: "string" },
                                matchedPlayer: { type: "string" },
                                ruleApplied: {
                                  type: "object",
                                  properties: {
                                    type: { type: "string" },
                                    amount: { type: "number" },
                                    description: { type: "string" },
                                  },
                                },
                                scoreChange: { type: "number" },
                                triggeredBy: {
                                  type: "string",
                                  enum: ["MANUAL", "AUTO"],
                                },
                                playerId: { type: "string" },
                                timestamp: {
                                  type: "string",
                                  format: "date-time",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },

      "/flip/{roomId}/status": {
        get: {
          summary: "Get current flip status",
          tags: ["Flip"],
          security: [{ bearerAuth: [] }],
          description: `
Returns current flip status and game progress.

Includes:
- Current flip number
- Total flips (game length)
- Revealed cards so far
- Player scores
- Timer status
- Game completion status

Used for:
- UI updates
- Progress tracking
- Timer synchronization
          `,
          parameters: [
            {
              name: "roomId",
              in: "path",
              required: true,
              description: "Room ID (MongoDB ObjectId)",
              schema: {
                type: "string",
                pattern: "^[0-9a-fA-F]{24}$",
              },
            },
          ],
          responses: {
            200: {
              description: "Flip status retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      data: {
                        type: "object",
                        properties: {
                          roomId: { type: "string" },
                          currentFlipNumber: { type: "number", example: 15 },
                          totalFlips: { type: "number", example: 52 },
                          revealedCards: {
                            type: "array",
                            items: { type: "string" },
                            example: ["AS", "KH", "QD"],
                          },
                          playerScores: {
                            type: "object",
                            additionalProperties: { type: "number" },
                            example: {
                              user1: 125,
                              user2: 75,
                              user3: -20,
                            },
                          },
                          timerActive: { type: "boolean", example: true },
                          gameComplete: { type: "boolean", example: false },
                          nextFlipNumber: { type: "number", example: 16 },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
            500: { description: "Server error" },
          },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SettlementStanding: {
        type: "object",
        description: "Player standing in final settlement",
        properties: {
          userId: {
            type: "string",
            example: "user_123",
            description: "Player's user ID",
          },
          username: {
            type: "string",
            example: "Player1",
            description: "Player's username",
          },
          rank: {
            type: "number",
            example: 1,
            description: "Final rank (1 = winner, 2 = second, etc.)",
          },
          entryFee: {
            type: "number",
            example: 100,
            description: "Entry fee paid to join game",
          },
          score: {
            type: "number",
            example: 150,
            description: "Final score from all flips (can be negative)",
          },
          finalPot: {
            type: "number",
            example: 250,
            description: "Entry fee + score",
          },
          platformFee: {
            type: "number",
            example: 7.5,
            description:
              "5% platform fee (only applied to winners with positive score)",
          },
          playerReceives: {
            type: "number",
            example: 242.5,
            description: "Amount credited to wallet (finalPot - platformFee)",
          },
          netChange: {
            type: "number",
            example: 142.5,
            description: "Net profit/loss (playerReceives - entryFee)",
          },
        },
      },
    },
  },

  // Socket.IO Events Documentation
  "x-socket-events": {
    description: `
# Socket.IO Events

## Connection
Connect to WebSocket server:
\`\`\`javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});
\`\`\`

---

## Game Events

### 📤 Client → Server

#### \`join_room\`
Join a game room
\`\`\`javascript
socket.emit('join_room', { roomId: '507f1f77bcf86cd799439011' });
\`\`\`

#### \`request_flip\`
Request to flip out of turn (competitive bidding)
\`\`\`javascript
socket.emit('request_flip', {
  roomId: '507f1f77bcf86cd799439011',
  bidAmount: 25.50
});
\`\`\`

---

### 📥 Server → Client

#### \`game_started\`
Game has begun
\`\`\`javascript
socket.on('game_started', (data) => {
  // data: { roomId, startedAt, playerCount, gameLength }
});
\`\`\`

#### \`card_flipped\`
A card was flipped and revealed
\`\`\`javascript
socket.on('card_flipped', (data) => {
  // data: {
  //   roomId: string,
  //   flipNumber: number,
  //   card: string,
  //   matchedPlayer: string | null,
  //   scoreChange: number,
  //   rule: { type: 'WIN' | 'LOSS' | 'NO_CHANGE', amount: number },
  //   timestamp: string
  // }
});
\`\`\`

#### \`score_updated\`
Player scores updated after flip
\`\`\`javascript
socket.on('score_updated', (data) => {
  // data: {
  //   roomId: string,
  //   flipNumber: number,
  //   scores: [
  //     { userId: string, username: string, score: number, cardsRemaining: number }
  //   ]
  // }
});
\`\`\`

#### \`flip_request_placed\`
Player placed bid for flip request
\`\`\`javascript
socket.on('flip_request_placed', (data) => {
  // data: {
  //   roomId: string,
  //   requesterId: string,
  //   username: string,
  //   bidAmount: number,
  //   expiresAt: number (timestamp),
  //   minimumBid: number
  // }
});
\`\`\`

#### \`flip_rights_granted\`
Flip request accepted - player can flip next
\`\`\`javascript
socket.on('flip_rights_granted', (data) => {
  // data: {
  //   roomId: string,
  //   playerId: string,
  //   username: string,
  //   bidAmount: number
  // }
});
\`\`\`

#### \`flip_request_rejected\`
Flip request expired or rejected
\`\`\`javascript
socket.on('flip_request_rejected', (data) => {
  // data: {
  //   roomId: string,
  //   requesterId: string,
  //   reason: 'EXPIRED' | 'OUTBID' | 'TIMER_COMPLETED',
  //   refundAmount: number
  // }
});
\`\`\`

#### \`game_ended\` 🏁
**Game complete - final settlement**

Emitted when all flips are complete and settlement is processed.

**Settlement Process:**
1. Calculate final scores from all flip history
2. Calculate final pot: \`finalPot = entryFee + score\`
3. Apply 5% platform fee to winners only: \`platformFee = (finalPot - entryFee) * 0.05 if finalPot > entryFee\`
4. Calculate player receives: \`playerReceives = finalPot - platformFee\`
5. Unlock entry fees from locked balances
6. Credit/debit wallet balances atomically
7. Log all transactions: ENTRY_FEE_UNLOCK, GAME_WIN/LOSS, PLATFORM_FEE

**Event Payload:**
\`\`\`javascript
socket.on('game_ended', (data) => {
  // data: {
  //   roomId: "507f1f77bcf86cd799439011",
  //   standings: [
  //     {
  //       userId: "user_123",
  //       username: "Player1",
  //       rank: 1,                    // Winner
  //       score: 150,                  // Final score
  //       netChange: 142.50,          // Profit: +$142.50
  //       platformFee: 7.50           // 5% on winnings
  //     },
  //     {
  //       userId: "user_456",
  //       username: "Player2",
  //       rank: 2,
  //       score: 25,
  //       netChange: 23.75,           // Small profit
  //       platformFee: 1.25
  //     },
  //     {
  //       userId: "user_789",
  //       username: "Player3",
  //       rank: 3,
  //       score: -75,
  //       netChange: -75.00,          // Lost $75
  //       platformFee: 0              // No fee on losers
  //     }
  //   ],
  //   completedAt: "2024-01-15T10:30:00.000Z"
  // }
});
\`\`\`

**Winner Determination:**
- Players ranked by \`playerReceives\` (highest to lowest)
- Rank 1 = Winner
- Platform takes 5% only from players with positive winnings

**Example Calculation:**
\`\`\`
Entry Fee: $100
Player Score: +150

Final Pot: $100 + $150 = $250
Winnings: $250 - $100 = $150
Platform Fee: $150 × 0.05 = $7.50
Player Receives: $250 - $7.50 = $242.50
Net Change: $242.50 - $100 = +$142.50
\`\`\`

**Loser Example:**
\`\`\`
Entry Fee: $100
Player Score: -75

Final Pot: $100 - $75 = $25
Winnings: -$75 (negative)
Platform Fee: $0 (no fee on losers)
Player Receives: $25
Net Change: $25 - $100 = -$75
\`\`\`

**Transaction Logs:**
Each player receives:
1. **ENTRY_FEE_UNLOCK**: Unlock locked entry fee
2. **GAME_WIN** or **GAME_LOSS**: Record score change (if score ≠ 0)
3. **PLATFORM_FEE**: Deduct platform fee (if fee > 0)

All wallet updates are atomic using MongoDB transactions.

---

## Disconnection & Reconnection Events

#### \`player_disconnected\`
Player disconnected from game
\`\`\`javascript
socket.on('player_disconnected', (data) => {
  // data: {
  //   userId: "user_123",
  //   username: "Player1",
  //   gracePeriod: 60000, // 1 minute in milliseconds
  //   message: "Player disconnected. Waiting 1 minute for reconnection..."
  // }
});
\`\`\`

**Disconnection Flow:**
1. Player loses connection (Socket.IO disconnect event)
2. Server marks player as DISCONNECTED
3. Grace period: 1 minute to reconnect
4. If it's their turn: auto-flip after 3 seconds
5. After 1 minute: replace with bot permanently

#### \`player_reconnected\`
Player reconnected successfully
\`\`\`javascript
socket.on('player_reconnected', (data) => {
  // data: {
  //   userId: "user_123",
  //   username: "Player1",
  //   message: "Player reconnected"
  // }
});
\`\`\`

**Reconnection Requirements:**
- Must reconnect within 1-minute grace period
- Cannot reconnect if already replaced by bot
- Receives full game state upon reconnection

#### \`reconnected\` (Private - Only to reconnecting player)
Full game state sent to reconnected player
\`\`\`javascript
socket.on('reconnected', (data) => {
  // data: {
  //   roomId: "room_abc123",
  //   currentFlip: 35,
  //   totalFlips: 52,
  //   yourCards: ["AS", "KH", "QD"], // Your remaining cards
  //   yourScore: 75, // Your current score
  //   allScores: {
  //     "user_456": 120,
  //     "user_789": -30,
  //     "user_123": 75
  //   },
  //   revealedCards: ["2H", "3D", "4S", "..."] // All flipped cards
  // }
});
\`\`\`

#### \`player_replaced_by_bot\`
Player was replaced by bot due to disconnection
\`\`\`javascript
socket.on('player_replaced_by_bot', (data) => {
  // data: {
  //   userId: "user_123", // Original player
  //   botId: "bot_abc456", // Bot player ID
  //   botName: "Bot_SwiftFox42", // Bot display name
  //   message: "Player replaced by bot due to disconnection"
  // }
});
\`\`\`

**Bot Replacement:**
- Happens after 1-minute grace period
- Bot takes over player's cards and score
- Bot plays automatically (no flip requests)
- Original player's wallet settled based on bot performance
- **No re-entry**: Once replaced, player cannot reconnect

**Bot Behavior:**
- Auto-flips when it's their turn (1-2 second delay)
- Does NOT make flip requests (no bidding)
- Random name: \`Bot_<Adjective><Noun><Number>\`
- Virtual wallet for decisions

---

## Error Events

#### \`error\`
Generic error occurred
\`\`\`javascript
socket.on('error', (data) => {
  // data: { code: string, message: string }
});
\`\`\`

#### \`flip_error\`
Flip-related error
\`\`\`javascript
socket.on('flip_error', (data) => {
  // data: {
  //   code: 'FLIP_001' | 'FLIP_002' | 'FLIP_003' | 'FLIP_004',
  //   message: string,
  //   details: object
  // }
});
\`\`\`

**Error Codes:**
- **FLIP_001**: Bid amount below minimum
- **FLIP_002**: Bid must be higher than current request
- **FLIP_003**: Player not in this game
- **FLIP_004**: Flip requests disabled for this round

---

## Settlement Error Codes

**GAME_007**: Game not complete - cannot settle yet
**GAME_008**: Game already settled
**GAME_009**: Error during settlement calculation
**GAME_010**: Cannot reconnect - replaced by bot
**GAME_011**: Invalid reconnection attempt
**GAME_012**: Error initializing bot player

---

## Platform Fee Policy

**Rate**: 5% of winnings
**Applied to**: Winners only (players with positive net gain)
**Not applied to**: 
- Players with negative scores
- Players who break even (score = 0)
- Entry fees (only on winnings)

**Formula**:
\`\`\`
if (finalPot > entryFee) {
  winnings = finalPot - entryFee
  platformFee = winnings × 0.05
} else {
  platformFee = 0
}
\`\`\`
    `,
  },

  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
