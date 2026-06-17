# Lobby Chat Module API Documentation

## Base URL

```
/api/v1/chat
```

## REST Endpoints

### 1. Get Chat History

**GET** `/api/v1/chat/history/:roomId`

**Description:** Get chat message history for a specific room

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `roomId`: Room ID to get chat history for

**Query Parameters:**

- `limit`: Number of messages (default: 50, max: 100)
- `before`: Get messages before this timestamp (optional, for pagination)

**Success Response (200):**

```json
{
  "message": "Chat history retrieved successfully",
  "data": {
    "messages": [
      {
        "messageId": "msg_1703098745_abc123",
        "roomId": "507f1f77bcf86cd799439020",
        "senderId": "507f1f77bcf86cd799439010",
        "senderUsername": "johndoe",
        "messageType": "TEXT",
        "content": "Good luck everyone!",
        "filtered": false,
        "timestamp": "2024-12-14T10:30:00.000Z"
      },
      {
        "messageId": "msg_1703098746_def456",
        "roomId": "507f1f77bcf86cd799439020",
        "senderId": "507f1f77bcf86cd799439011",
        "senderUsername": "janesmith",
        "messageType": "TEXT",
        "content": "Thanks! You too!",
        "filtered": false,
        "timestamp": "2024-12-14T10:30:15.000Z"
      },
      {
        "messageId": "msg_1703098747_ghi789",
        "roomId": "507f1f77bcf86cd799439020",
        "senderId": "507f1f77bcf86cd799439012",
        "senderUsername": "mike23",
        "messageType": "TEXT",
        "content": "*** game!",
        "originalContent": "bad game!",
        "filtered": true,
        "timestamp": "2024-12-14T10:30:30.000Z"
      }
    ],
    "hasMore": true,
    "oldestTimestamp": "2024-12-14T10:25:00.000Z",
    "messageCount": 50
  }
}
```

---

### 2. Mute User (Admin Only)

**POST** `/api/v1/chat/mute`

**Description:** Mute a user from sending chat messages

**Authentication:** Required (Admin role)

**Request Body:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "duration": 3600,
  "reason": "Spamming chat"
}
```

**Validation Rules:**

- `userId`: Required, valid MongoDB ObjectId
- `duration`: Required, number (seconds), min: 60, max: 2592000 (30 days)
- `reason`: Required, string, max 500 characters

**Success Response (200):**

```json
{
  "message": "User muted successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "spammer23",
    "mutedBy": "507f1f77bcf86cd799439001",
    "mutedByUsername": "admin",
    "duration": 3600,
    "mutedUntil": "2024-12-14T11:30:00.000Z",
    "reason": "Spamming chat"
  }
}
```

**Socket Event Emitted:** `user_muted` (to the muted user)

---

### 3. Unmute User (Admin Only)

**POST** `/api/v1/chat/unmute`

**Description:** Remove mute from a user

**Authentication:** Required (Admin role)

**Request Body:**

```json
{
  "userId": "507f1f77bcf86cd799439011"
}
```

**Success Response (200):**

```json
{
  "message": "User unmuted successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "spammer23",
    "unmutedBy": "507f1f77bcf86cd799439001",
    "unmutedAt": "2024-12-14T10:45:00.000Z"
  }
}
```

**Socket Event Emitted:** `user_unmuted` (to the unmuted user)

---

### 4. Get Quick Messages

**GET** `/api/v1/chat/quick-messages`

**Description:** Get list of predefined quick messages

**Authentication:** Optional (Public endpoint)

**Success Response (200):**

```json
{
  "message": "Quick messages retrieved successfully",
  "data": {
    "quickMessages": {
      "QM_001": "Good luck everyone!",
      "QM_002": "Let's play!",
      "QM_003": "Nice game!",
      "QM_004": "Well played!",
      "QM_005": "Thanks!",
      "QM_006": "Sorry!",
      "QM_007": "Rematch?",
      "QM_008": "BRB",
      "QM_009": "GG!",
      "QM_010": "Welcome!"
    }
  }
}
```

---

### 5. Get User Mute Status

**GET** `/api/v1/chat/mute-status/:userId`

**Description:** Check if a user is currently muted

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `userId`: User ID to check (defaults to current user)

**Success Response (200):**

```json
{
  "message": "Mute status retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "isMuted": true,
    "mutedBy": "admin",
    "mutedUntil": "2024-12-14T11:30:00.000Z",
    "reason": "Spamming chat",
    "remainingSeconds": 1542
  }
}
```

**If Not Muted:**

```json
{
  "message": "Mute status retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "isMuted": false
  }
}
```

---

## Socket.IO Events

### Events Sent by Client

**Event:** `chat_message`
**Description:** Send a chat message to a room
**Payload:**

```json
{
  "roomId": "507f1f77bcf86cd799439020",
  "messageType": "TEXT",
  "content": "Hello everyone!"
}
```

**For Quick Message:**

```json
{
  "roomId": "507f1f77bcf86cd799439020",
  "messageType": "QUICK_MESSAGE",
  "quickMessageId": "QM_001"
}
```

---

### Events Received by Client

**Event:** `chat_message`
**Description:** Receive a chat message in a room
**Payload:**

```json
{
  "messageId": "msg_1703098745_abc123",
  "roomId": "507f1f77bcf86cd799439020",
  "senderId": "507f1f77bcf86cd799439010",
  "senderUsername": "johndoe",
  "messageType": "TEXT",
  "content": "Good luck everyone!",
  "filtered": false,
  "timestamp": "2024-12-14T10:30:00.000Z"
}
```

**Event:** `user_muted`
**Description:** User has been muted
**Payload:**

```json
{
  "reason": "Spamming chat",
  "mutedUntil": "2024-12-14T11:30:00.000Z",
  "duration": 3600
}
```

**Event:** `user_unmuted`
**Description:** User has been unmuted
**Payload:**

```json
{
  "message": "You have been unmuted",
  "unmutedAt": "2024-12-14T10:45:00.000Z"
}
```

**Event:** `chat_error`
**Description:** Error sending chat message
**Payload:**

```json
{
  "error": "CHAT_002",
  "message": "You are muted",
  "mutedUntil": "2024-12-14T11:30:00.000Z"
}
```

---

## Chat Security Features

### 1. Profanity Filter

- **Detection Method:** Pattern matching with l33t speak normalization
- **L33t Speak Conversion:**
  ```
  @ → a
  3 → e
  1 → i
  0 → o
  5 → s
  7 → t
  $ → s
  ```
- **Filtered Words:** Comprehensive list of profanity/offensive words
- **Behavior:**
  - Original message preserved in `originalContent` field
  - Filtered message stored in `content` field with asterisks (e.g., "\*\*\*")
  - `filtered` flag set to `true`

**Example:**

```
Input: "This is b@d"
After l33t speak: "This is bad"
Output: "This is ***"
```

### 2. Rate Limiting

- **Limit:** 10 messages per minute per user
- **Storage:** Redis with 60-second rolling window
- **Key:** `chat:ratelimit:${userId}`
- **Behavior:**
  - First 10 messages within 60 seconds: Allowed
  - 11th message: Blocked with `CHAT_003` error
  - Counter resets after 60 seconds

### 3. Message Length Limit

- **Maximum:** 500 characters
- **Validation:** Enforced at:
  - MongoDB model level (maxlength: 500)
  - Service layer validation
  - Socket.IO handler validation
- **Error:** `CHAT_004` if exceeded

### 4. Admin Mute Capability

- **Duration:** Configurable (1 minute to 30 days)
- **Storage:** Redis with TTL matching mute duration
- **Key:** `muted:${userId}`
- **Behavior:**
  - Muted users cannot send messages
  - Muted users receive `CHAT_002` error
  - Socket.IO events notify muted/unmuted users
  - Mute automatically expires after duration

---

## Chat Restrictions

### When Chat is Allowed

- ✅ Lobby (room status: WAITING)
- ✅ User is in the room
- ✅ User is not muted
- ✅ User has not exceeded rate limit

### When Chat is Blocked

- ❌ Game in progress (room status: IN_PROGRESS)
- ❌ User not in room
- ❌ User is muted
- ❌ Rate limit exceeded (10 messages/min)
- ❌ Message too long (> 500 chars)

---

## Error Codes

| Code       | Message                               |
| ---------- | ------------------------------------- |
| `CHAT_001` | Cannot send chat in this room         |
| `CHAT_002` | You are muted                         |
| `CHAT_003` | Too many messages. Slow down.         |
| `CHAT_004` | Message too long (max 500 characters) |
| `CHAT_005` | Invalid quick message ID              |
| `CHAT_006` | Room not found                        |
| `CHAT_007` | Game already started                  |

---

## Constants

```typescript
CHAT_RATE_LIMIT = {
  MAX_MESSAGES_PER_MINUTE: 10,
  WINDOW_SECONDS: 60,
};

CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_HISTORY_MESSAGES: 50,
  MESSAGE_TTL_DAYS: 7, // Auto-delete after 7 days
};

QUICK_MESSAGES = {
  QM_001: "Good luck everyone!",
  QM_002: "Let's play!",
  QM_003: "Nice game!",
  QM_004: "Well played!",
  QM_005: "Thanks!",
  QM_006: "Sorry!",
  QM_007: "Rematch?",
  QM_008: "BRB",
  QM_009: "GG!",
  QM_010: "Welcome!",
};
```

---

## Redis Keys

### Rate Limiting

```
Key: chat:ratelimit:${userId}
Value: message count (integer)
TTL: 60 seconds
```

### User Mute

```
Key: muted:${userId}
Value: JSON {
  reason: string,
  mutedBy: string,
  mutedUntil: Date
}
TTL: Custom based on mute duration
```

---

## Database Model

### ChatMessage

```typescript
{
  messageId: string,
  roomId: ObjectId,
  senderId: ObjectId,
  senderUsername: string,
  messageType: "TEXT" | "QUICK_MESSAGE",
  content: string,
  quickMessageId: string,
  filtered: boolean,
  originalContent: string,
  timestamp: Date,
  createdAt: Date
}
```

**TTL Index:** Messages auto-delete after 7 days

---

## Example Usage

### Socket.IO Client (JavaScript)

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "YOUR_JWT_TOKEN",
  },
});

// Send chat message
socket.emit("chat_message", {
  roomId: "507f1f77bcf86cd799439020",
  messageType: "TEXT",
  content: "Hello everyone!",
});

// Receive chat messages
socket.on("chat_message", (data) => {
  console.log(`${data.senderUsername}: ${data.content}`);
});

// Handle errors
socket.on("chat_error", (error) => {
  console.error(`Chat error: ${error.message}`);
});
```

### REST API (cURL)

**Get Chat History:**

```bash
curl -X GET http://localhost:3000/api/v1/chat/history/507f1f77bcf86cd799439020?limit=50 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Mute User (Admin):**

```bash
curl -X POST http://localhost:3000/api/v1/chat/mute \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "duration": 3600,
    "reason": "Spamming chat"
  }'
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Profanity Filtering:**

   - Send "bad word" → Filtered to "\*\*\*" ✓
   - Send "b@d w0rd" (l33t speak) → Filtered ✓
   - Original message preserved in originalContent ✓
   - filtered flag = true ✓

2. **Rate Limiting:**

   - Send 9 messages quickly → All sent ✓
   - Send 10th message → Sent ✓
   - Send 11th message → CHAT_003 error ✓
   - Wait 60 seconds → Can send again ✓

3. **Quick Message Expansion:**

   - Send QM_001 → "Good luck everyone!" ✓
   - Send invalid ID → CHAT_005 error ✓
   - Quick messages bypass profanity filter ✓

4. **Mute Enforcement:**

   - Admin mutes user → user_muted event ✓
   - Muted user tries to send → CHAT_002 error ✓
   - Mute expires → user_unmuted event ✓
   - User can send messages again ✓

5. **Chat Restrictions:**

   - Send in lobby → Works ✓
   - Game starts → CHAT_007 error ✓
   - Leave room → Cannot send ✓

6. **Message TTL:**

   - Messages older than 7 days → Auto-deleted ✓
   - Recent messages → Available in history ✓

7. **Edge Cases:**
   - Message exactly 500 chars → Sent ✓
   - Message 501 chars → CHAT_004 error ✓
   - Empty message → Validation error ✓
   - Special characters → Handled correctly ✓
