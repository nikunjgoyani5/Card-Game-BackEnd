# Card Game Backend - API Documentation

## 📚 Complete API Reference

This documentation covers all REST APIs and Socket.IO events for the Card Game Backend application.

---

## 📖 Module Documentation

### Core Modules

1. **[Auth Module](./01-AUTH-MODULE.md)** - User authentication and profile management

   - Registration, Login, Google OAuth
   - Profile management
   - JWT authentication
   - 6 endpoints

2. **[Room & Game Module](./09-ROOM-GAME-MODULE.md)** - Core gameplay functionality

   - Room creation and management
   - Matchmaking system
   - Game state management
   - Card flipping mechanics
   - Bidding system
   - 10 endpoints + extensive Socket.IO events

3. **[Wallet Module](./10-WALLET-MODULE.md)** - Wallet and balance management
   - Balance checking (realMoney & coins)
   - Lock/unlock entry fees
   - Buy coins
   - Ad rewards
   - 7 endpoints

---

### Social & Community

4. **[Friends Module](./02-FRIENDS-MODULE.md)** - Friends and social features

   - Search users
   - Send/accept/reject friend requests
   - Friend list management
   - Online status tracking
   - 8 endpoints + Socket.IO events

5. **[Chat Module](./07-CHAT-MODULE.md)** - Lobby chat system
   - Room chat
   - Profanity filtering
   - Rate limiting (10 msg/min)
   - Quick messages
   - Admin mute capability
   - 5 endpoints + Socket.IO events

---

### Financial

6. **[Payment Module](./03-PAYMENT-MODULE.md)** - Payment processing

   - Initiate deposits
   - Payment gateway integration (Razorpay, Stripe, PayPal)
   - Webhook handling
   - Transaction history
   - 5 endpoints

7. **[Withdrawal & KYC Module](./04-WITHDRAWAL-KYC-MODULE.md)** - Withdrawals and identity verification
   - KYC submission and verification
   - Withdrawal requests
   - Status tracking
   - Transaction history
   - 7 endpoints (3 KYC + 4 Withdrawal)

---

### User Engagement

8. **[Notification Module](./05-NOTIFICATION-MODULE.md)** - Real-time notifications

   - Get notifications
   - Mark as read
   - Notification preferences
   - 12 notification types
   - 5 endpoints + Socket.IO events

9. **[Leaderboard Module](./06-LEADERBOARD-MODULE.md)** - Rankings and statistics
   - Global leaderboard
   - Friends leaderboard
   - Player statistics
   - Achievement badges
   - Background scheduler
   - 4 endpoints

---

### Administration

10. **[Admin Module](./08-ADMIN-MODULE.md)** - Administrative controls
    - View active games
    - Ban/unban players
    - Issue refunds
    - Dashboard analytics
    - Dispute resolution
    - Player search
    - Audit logs
    - 8 endpoints (ADMIN/SUPER_ADMIN only)

---

### Real-Time Communication

11. **[Socket.IO Events](./11-SOCKET-IO-EVENTS.md)** - Complete Socket.IO reference
    - Connection setup
    - Room & lobby events
    - Game events
    - Chat events
    - Friend events
    - Notification events
    - Admin events
    - Code examples

---

## 🚀 Quick Start Guide

### 1. Authentication

First, register or login to get a JWT token:

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "phone": "1234567890"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Response:** Save the JWT token from the response.

---

### 2. Connect Socket.IO

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "YOUR_JWT_TOKEN",
  },
});

socket.on("connect", () => {
  console.log("Connected!");
});
```

---

### 3. Create/Join a Game

```javascript
// Create room
socket.emit(
  "create_room",
  {
    roomType: "PUBLIC",
    maxPlayers: 4,
    entryFee: 100,
    gameMode: "CLASSIC",
    gameLength: "MEDIUM",
  },
  (response) => {
    console.log("Room created:", response.room);
  }
);

// OR join existing room
socket.emit(
  "join_room",
  {
    joinMethod: "ROOM_CODE",
    code: "ABC123",
  },
  (response) => {
    console.log("Joined room:", response.room);
  }
);
```

---

### 4. Play the Game

```javascript
// Listen for game start
socket.on("game_started", (data) => {
  console.log("Game started! Your cards:", data.cards);
});

// Flip card on your turn
socket.on("turn_changed", (data) => {
  if (data.currentPlayer.userId === myUserId) {
    socket.emit(
      "flip_card",
      {
        roomId: roomId,
        cardPosition: 0,
      },
      (response) => {
        console.log("Flipped:", response.card);
      }
    );
  }
});

// See results
socket.on("game_ended", (data) => {
  console.log("Winner:", data.winner);
  console.log("Your winnings:", data.yourWinnings);
});
```

---

## 🔐 Authentication

All API endpoints require authentication via JWT token (except registration, login, and some public endpoints).

### Header Format:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Token Expiry:

- Access Token: 24 hours
- Refresh Token: 30 days

### Getting Token:

- **Login:** `/api/v1/auth/login`
- **Register:** `/api/v1/auth/register`
- **Google OAuth:** `/api/v1/auth/google`

---

## 🎮 Game Modes

| Mode           | Description                               | Entry Fee Range |
| -------------- | ----------------------------------------- | --------------- |
| **CLASSIC**    | Traditional gameplay, 5 cards per player  | $10 - $1000     |
| **SPEED**      | Fast-paced, 30s per turn                  | $10 - $500      |
| **TOURNAMENT** | Scheduled tournaments, elimination rounds | $50 - $5000     |

### Game Lengths:

- **SHORT:** 3 rounds, 5 minutes avg
- **MEDIUM:** 5 rounds, 10 minutes avg
- **LONG:** 7 rounds, 15 minutes avg

---

## 💰 Wallet System

The application has a **dual-wallet system**:

### 1. Real Money Wallet

- Actual currency (USD, INR, etc.)
- Can be **deposited** and **withdrawn**
- Requires **KYC** for large transactions
- Used for real-money games

### 2. Coin Wallet

- In-game virtual currency
- **Cannot be withdrawn**
- Earned through:
  - Watching ads
  - Daily bonuses
  - Achievements
  - Promotions
- Can be purchased with real money
- Used for casual/practice games

### Conversion Rate:

- 100 coins = $1.00
- Bulk purchases get bonuses (10-50%)

---

## 📊 API Base URLs

| Environment | Base URL                                  |
| ----------- | ----------------------------------------- |
| Development | `http://localhost:3000/api/v1`            |
| Staging     | `https://staging.api.cardgame.com/api/v1` |
| Production  | `https://api.cardgame.com/api/v1`         |

### Socket.IO URLs:

| Environment | Socket URL                         |
| ----------- | ---------------------------------- |
| Development | `http://localhost:3000`            |
| Staging     | `https://staging.api.cardgame.com` |
| Production  | `https://api.cardgame.com`         |

---

## 📝 Request/Response Format

### Standard Success Response:

```json
{
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Standard Error Response:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error details
  }
}
```

### HTTP Status Codes:

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request (validation error)       |
| 401  | Unauthorized (invalid/missing token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found                            |
| 409  | Conflict (duplicate entry)           |
| 429  | Too Many Requests (rate limit)       |
| 500  | Internal Server Error                |

---

## 🔒 Security Features

### Authentication & Authorization

- ✅ JWT-based authentication
- ✅ Role-based access control (PLAYER, ADMIN, SUPER_ADMIN)
- ✅ Token expiry and refresh
- ✅ Google OAuth integration

### Payment Security

- ✅ PCI-DSS compliant (no card storage)
- ✅ Webhook signature verification
- ✅ Transaction atomicity
- ✅ Fraud detection

### Data Protection

- ✅ Password hashing (bcrypt)
- ✅ Input sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Rate limiting

### KYC & Compliance

- ✅ Identity verification
- ✅ Document encryption (S3)
- ✅ Audit logging
- ✅ Withdrawal limits based on KYC level

### Game Integrity

- ✅ Server-side card shuffling (seeded random)
- ✅ Turn validation
- ✅ Anti-cheat detection
- ✅ Disconnection handling (60s grace period)

---

## ⚡ Rate Limits

| Feature                 | Limit | Window     |
| ----------------------- | ----- | ---------- |
| **Login attempts**      | 5     | 15 minutes |
| **Registration**        | 3     | 1 hour     |
| **Friend requests**     | 20    | 24 hours   |
| **Chat messages**       | 10    | 1 minute   |
| **Room creation**       | 10    | 1 hour     |
| **API requests**        | 100   | 1 minute   |
| **Payment attempts**    | 5     | 1 hour     |
| **Withdrawal requests** | 3     | 24 hours   |

**Rate limit headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702540800
```

---

## 🧪 Testing Guidelines

### Manual Testing Checklist

Each module documentation includes:

- ✅ Complete endpoint list
- ✅ Request/response examples
- ✅ cURL commands for testing
- ✅ Manual QA checklist
- ✅ Testing scenarios
- ✅ Edge cases

### Tools for Testing:

**REST APIs:**

- Postman
- cURL
- Insomnia
- VS Code REST Client

**Socket.IO:**

- socket.io-client (Node.js)
- Postman (WebSocket)
- Browser Console
- Socket.IO Tester Chrome Extension

### Sample Postman Collection:

Import the provided Postman collection for quick testing:

```bash
# Available in: /postman/CardGame-Backend.postman_collection.json
```

---

## 📦 Data Models

### Key Database Models:

- **User** - User accounts and profiles
- **Room** - Game rooms
- **GameResult** - Completed game results
- **Transaction** - Financial transactions
- **PaymentTransaction** - Payment gateway transactions
- **WithdrawalRequest** - Withdrawal requests
- **KYCVerification** - KYC submissions
- **Friendship** - Friend relationships
- **ChatMessage** - Chat messages
- **Notification** - User notifications
- **NotificationPreferences** - Notification settings
- **PlayerStats** - Player statistics
- **AdminAuditLog** - Admin actions
- **FlipHistory** - Card flip history
- **FraudDetection** - Fraud monitoring
- **BotActivity** - Bot detection
- **CriticalError** - Error logging

---

## 🔄 Common Flows

### 1. New Player Flow

```
1. Register → /api/v1/auth/register
2. Get profile → /api/v1/auth/profile
3. Check wallet → /api/v1/wallet
4. Deposit money → /api/v1/payments/deposit
5. Create/join room → Socket: create_room or join_room
6. Play game → Socket: flip_card
7. View stats → /api/v1/leaderboard/stats/:userId
```

### 2. Payment Flow

```
1. Initiate deposit → /api/v1/payments/deposit
2. Redirect to payment gateway
3. Complete payment
4. Webhook callback → /api/v1/payments/webhook
5. Wallet updated automatically
6. Check status → /api/v1/payments/status/:transactionId
```

### 3. Withdrawal Flow

```
1. Submit KYC → /api/v1/kyc/submit
2. Wait for approval
3. Request withdrawal → /api/v1/withdrawals/request
4. Admin review
5. Check status → /api/v1/withdrawals/status/:requestId
6. Funds transferred (3-5 business days)
```

### 4. Game Flow

```
1. Create room (Socket)
2. Players join (Socket)
3. Game starts (auto/manual)
4. Players flip cards in turn
5. Bust or pass
6. Winner determined
7. Pot distributed
8. GameResult saved
9. Stats updated
10. Leaderboard updated
```

---

## 🐛 Error Handling

### Error Code Prefixes:

- `AUTH_xxx` - Authentication errors
- `ROOM_xxx` - Room-related errors
- `GAME_xxx` - Game-related errors
- `CHAT_xxx` - Chat errors
- `WALLET_xxx` - Wallet errors
- `PAYMENT_xxx` - Payment errors
- `WITHDRAWAL_xxx` - Withdrawal errors
- `KYC_xxx` - KYC errors
- `FRIEND_xxx` - Friend errors
- `ADMIN_xxx` - Admin errors

### Common Errors:

```javascript
// Insufficient balance
{
  "error": "WALLET_001",
  "message": "Insufficient balance",
  "details": {
    "required": 100,
    "available": 50
  }
}

// Invalid token
{
  "error": "AUTH_002",
  "message": "Invalid or expired token"
}

// Rate limit exceeded
{
  "error": "RATE_LIMIT",
  "message": "Too many requests. Please try again later.",
  "details": {
    "retryAfter": 60
  }
}
```

---

## 🎯 Best Practices

### 1. API Usage

- Always include `Authorization` header
- Handle rate limits gracefully
- Implement exponential backoff for retries
- Validate data before sending

### 2. Socket.IO

- Always authenticate connections
- Handle reconnection scenarios
- Clean up event listeners
- Implement timeout handling

### 3. Error Handling

- Check `response.ok` in callbacks
- Display user-friendly error messages
- Log errors for debugging
- Implement fallback mechanisms

### 4. Security

- Never expose JWT tokens
- Use HTTPS in production
- Validate all user inputs
- Implement CSRF protection

---

## 📞 Support

### Technical Support:

- **Email:** dev@cardgame.com
- **Slack:** #api-support
- **Documentation:** https://docs.cardgame.com

### Reporting Issues:

1. Check existing documentation
2. Search FAQ
3. Create GitHub issue with:
   - Endpoint/Event name
   - Request payload
   - Expected vs actual response
   - Error messages
   - Environment details

---

## 📚 Additional Resources

- **Postman Collection:** `/postman/CardGame-Backend.postman_collection.json`
- **API Changelog:** `CHANGELOG.md`
- **Security Audit:** `PHASE_3_SECURITY_AUDIT.md`
- **Database Schema:** `DATABASE_SCHEMA_ALIGNMENT.md`
- **Redis Keys:** `REDIS_CACHE_STRUCTURES.md`

---

## 📄 License

Copyright © 2024 Card Game Inc. All rights reserved.

---

## 🔄 Version History

- **v3.0.0** (Current) - Phase 3 complete

  - Friends system
  - Payment integration
  - Withdrawal & KYC
  - Notifications
  - Leaderboards
  - Chat system
  - Admin panel

- **v2.0.0** - Phase 2

  - Core gameplay
  - Room management
  - Wallet system
  - Basic authentication

- **v1.0.0** - Phase 1
  - Initial release
  - User registration
  - Basic game mechanics

---

## 🗺️ Documentation Navigation

| #   | Module                                            | Endpoints | Socket Events | Priority    |
| --- | ------------------------------------------------- | --------- | ------------- | ----------- |
| 1   | [Auth](./01-AUTH-MODULE.md)                       | 6         | -             | 🔴 Critical |
| 2   | [Friends](./02-FRIENDS-MODULE.md)                 | 8         | 2             | 🟡 High     |
| 3   | [Payment](./03-PAYMENT-MODULE.md)                 | 5         | -             | 🔴 Critical |
| 4   | [Withdrawal & KYC](./04-WITHDRAWAL-KYC-MODULE.md) | 7         | -             | 🔴 Critical |
| 5   | [Notification](./05-NOTIFICATION-MODULE.md)       | 5         | 2             | 🟢 Medium   |
| 6   | [Leaderboard](./06-LEADERBOARD-MODULE.md)         | 4         | -             | 🟢 Medium   |
| 7   | [Chat](./07-CHAT-MODULE.md)                       | 5         | 4             | 🟡 High     |
| 8   | [Admin](./08-ADMIN-MODULE.md)                     | 8         | -             | 🟡 High     |
| 9   | [Room & Game](./09-ROOM-GAME-MODULE.md)           | 10        | 10+           | 🔴 Critical |
| 10  | [Wallet](./10-WALLET-MODULE.md)                   | 7         | -             | 🔴 Critical |
| 11  | [Socket.IO Events](./11-SOCKET-IO-EVENTS.md)      | -         | All           | 🔴 Critical |

**Total:** 65 REST Endpoints + 20+ Socket.IO Events

---

_Last Updated: December 2024_
_Documentation Version: 3.0.0_
