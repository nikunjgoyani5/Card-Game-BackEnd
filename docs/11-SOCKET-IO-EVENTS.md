# Socket.IO Events - Comprehensive Documentation

## Connection Setup

### Initialize Socket Connection

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "YOUR_JWT_TOKEN", // Required for authentication
  },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Connection established
socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});

// Connection error
socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});

// Disconnected
socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});
```

---

## Authentication

### Server-Side Middleware

- All Socket.IO connections require JWT authentication
- Token must be provided in `auth.token` during connection
- Invalid token → Connection rejected with "invalid token" error
- User ID attached to socket instance after successful auth

---

## Event Categories

1. **Room & Lobby Events** - Room creation, joining, player management
2. **Game Events** - Gameplay actions, turn management, card flipping
3. **Chat Events** - Messaging and moderation
4. **Friend Events** - Friend status and requests
5. **Notification Events** - Real-time notifications
6. **Admin Events** - Administrative actions

---

## 1. ROOM & LOBBY EVENTS

### Client → Server Events

#### create_room

**Description:** Create a new game room

**Emit:**

```javascript
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
    if (response.ok) {
      console.log("Room created:", response.room);
    } else {
      console.error("Error:", response.error);
    }
  }
);
```

**Response:**

```javascript
{
  ok: true,
  room: {
    _id: '507f1f77bcf86cd799439020',
    roomCode: 'ABC123',
    roomType: 'PUBLIC',
    gameMode: 'CLASSIC',
    currentPlayers: 1,
    maxPlayers: 4,
    entryFee: 100,
    status: 'WAITING'
  }
}
```

---

#### join_room

**Description:** Join an existing room

**Emit:**

```javascript
// Method 1: Join by room code
socket.emit(
  "join_room",
  {
    joinMethod: "ROOM_CODE",
    code: "ABC123",
  },
  (response) => {
    if (response.ok) {
      console.log("Joined:", response.room);
    }
  }
);

// Method 2: Matchmaking
socket.emit(
  "join_room",
  {
    joinMethod: "MATCHMAKING",
    gameLength: "MEDIUM",
    betMultiplier: 1.0,
    maxPlayers: 4,
  },
  (response) => {
    if (response.matchmaking) {
      console.log("Waiting for players...");
    }
  }
);

// Method 3: Direct room ID
socket.emit(
  "join_room",
  {
    joinMethod: "ROOM_ID",
    roomId: "507f1f77bcf86cd799439020",
  },
  (response) => {
    console.log("Joined room");
  }
);
```

---

#### leave_room

**Description:** Leave current room

**Emit:**

```javascript
socket.emit(
  "leave_room",
  {
    roomId: "507f1f77bcf86cd799439020",
  },
  (response) => {
    if (response.ok) {
      console.log("Left room successfully");
    }
  }
);
```

---

### Server → Client Events

#### room_created

**Description:** Broadcast when a new public room is created

**Receive:**

```javascript
socket.on("room_created", (data) => {
  console.log("New room available:", data);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   gameMode: 'CLASSIC',
  //   gameLength: 'MEDIUM',
  //   currentPlayers: 1,
  //   maxPlayers: 4,
  //   entryFee: 100,
  //   maxWinningAmount: 400,
  //   roomType: 'PUBLIC'
  // }
});
```

**Target:** Broadcast to all connected clients (lobby)

---

#### player_joined

**Description:** Sent when a player joins the room

**Receive:**

```javascript
socket.on("player_joined", (data) => {
  console.log(`${data.player.username} joined!`);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   player: {
  //     userId: '507f1f77bcf86cd799439011',
  //     username: 'janesmith',
  //     joinedAt: '2024-12-14T10:31:00.000Z'
  //   },
  //   currentPlayers: 2,
  //   maxPlayers: 4
  // }
});
```

**Target:** All players in the room

---

#### player_left

**Description:** Sent when a player leaves the room

**Receive:**

```javascript
socket.on("player_left", (data) => {
  console.log(`${data.player.username} left`);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   player: {
  //     userId: '507f1f77bcf86cd799439011',
  //     username: 'janesmith'
  //   },
  //   currentPlayers: 1,
  //   maxPlayers: 4,
  //   reason: 'VOLUNTARY'  // or 'DISCONNECTED', 'KICKED'
  // }
});
```

**Target:** All players in the room

---

#### matchmaking_waiting

**Description:** Matchmaking status update

**Receive:**

```javascript
socket.on("matchmaking_waiting", (data) => {
  console.log("Waiting for players:", data);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   status: 'WAITING_FOR_PLAYERS',
  //   message: 'Waiting for more players...',
  //   timeoutIn: 300,  // seconds
  //   currentPlayers: 1,
  //   maxPlayers: 4
  // }
});
```

**Target:** Player who initiated matchmaking

---

## 2. GAME EVENTS

### Client → Server Events

#### flip_card

**Description:** Flip a card during your turn

**Emit:**

```javascript
socket.emit(
  "flip_card",
  {
    roomId: "507f1f77bcf86cd799439020",
    cardPosition: 0, // 0-4 (5 cards per player)
  },
  (response) => {
    if (response.ok) {
      console.log("Card flipped:", response.card);
      console.log("New hand value:", response.handValue);
      console.log("Status:", response.status); // 'SAFE', 'BUST', 'BLACKJACK'
    } else {
      console.error("Error:", response.error);
    }
  }
);
```

---

#### respond_to_flip_request

**Description:** Respond to another player's flip request (bidding)

**Emit:**

```javascript
// Accept the flip request
socket.emit(
  "respond_to_flip_request",
  {
    requestId: "507f1f77bcf86cd799439500",
    action: "ACCEPT",
  },
  (response) => {
    console.log("Response submitted");
  }
);

// Reject the flip request
socket.emit(
  "respond_to_flip_request",
  {
    requestId: "507f1f77bcf86cd799439500",
    action: "REJECT",
  },
  (response) => {
    console.log("Request rejected");
  }
);

// Counter-bid (bid higher to flip instead)
socket.emit(
  "respond_to_flip_request",
  {
    requestId: "507f1f77bcf86cd799439500",
    action: "COUNTER_BID",
    counterBidAmount: 75,
  },
  (response) => {
    console.log("Counter-bid submitted");
  }
);
```

---

### Server → Client Events

#### game_started

**Description:** Game has started

**Receive:**

```javascript
socket.on("game_started", (data) => {
  console.log("Game starting!");
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   status: 'IN_PROGRESS',
  //   startedAt: '2024-12-14T10:35:00.000Z',
  //   pot: 400,
  //   turnOrder: [
  //     '507f1f77bcf86cd799439010',
  //     '507f1f77bcf86cd799439011',
  //     '507f1f77bcf86cd799439012',
  //     '507f1f77bcf86cd799439013'
  //   ],
  //   currentTurn: '507f1f77bcf86cd799439010',
  //   cards: [
  //     { rank: 'A', suit: '♠', value: 11, flipped: false, position: 0 },
  //     { rank: 'K', suit: '♥', value: 10, flipped: false, position: 1 },
  //     // ... 3 more cards
  //   ]
  // }
});
```

**Target:** All players in the room

---

#### turn_changed

**Description:** Turn has moved to next player

**Receive:**

```javascript
socket.on("turn_changed", (data) => {
  console.log("Now it's", data.currentPlayer.username, "'s turn");
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   currentPlayer: {
  //     userId: '507f1f77bcf86cd799439011',
  //     username: 'janesmith'
  //   },
  //   previousPlayer: {
  //     userId: '507f1f77bcf86cd799439010',
  //     username: 'johndoe'
  //   },
  //   turnNumber: 2,
  //   timeRemaining: 60  // seconds
  // }
});
```

**Target:** All players in the room

---

#### card_flipped

**Description:** A player flipped a card

**Receive:**

```javascript
socket.on("card_flipped", (data) => {
  console.log(`${data.player.username} flipped:`, data.card);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   player: {
  //     userId: '507f1f77bcf86cd799439011',
  //     username: 'janesmith'
  //   },
  //   card: {
  //     rank: 'K',
  //     suit: '♥',
  //     value: 10,
  //     position: 1
  //   },
  //   previousHandValue: 11,
  //   newHandValue: 21,
  //   status: 'BLACKJACK',  // or 'SAFE', 'BUST'
  //   cardsFlipped: 2,
  //   totalCards: 5
  // }
});
```

**Target:** All players in the room

---

#### flip_request_received

**Description:** A player wants to flip out of turn (bidding)

**Receive:**

```javascript
socket.on("flip_request_received", (data) => {
  console.log(`${data.player.username} wants to flip for ${data.bidAmount}`);
  // {
  //   requestId: '507f1f77bcf86cd799439500',
  //   roomId: '507f1f77bcf86cd799439020',
  //   player: {
  //     userId: '507f1f77bcf86cd799439012',
  //     username: 'mike23'
  //   },
  //   bidAmount: 50,
  //   expiresAt: '2024-12-14T10:36:00.000Z',
  //   remainingSeconds: 30
  // }
});
```

**Target:** All other players in the room

---

#### flip_request_resolved

**Description:** Flip request has been accepted/rejected

**Receive:**

```javascript
socket.on("flip_request_resolved", (data) => {
  console.log("Flip request result:", data.result);
  // {
  //   requestId: '507f1f77bcf86cd799439500',
  //   result: 'ACCEPTED',  // or 'REJECTED', 'OUTBID', 'EXPIRED'
  //   winner: {
  //     userId: '507f1f77bcf86cd799439012',
  //     username: 'mike23',
  //     bidAmount: 50
  //   },
  //   potUpdated: 450
  // }
});
```

**Target:** All players in the room

---

#### game_ended

**Description:** Game has ended with results

**Receive:**

```javascript
socket.on("game_ended", (data) => {
  console.log("Game over! Winner:", data.winner.username);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   winner: {
  //     userId: '507f1f77bcf86cd799439011',
  //     username: 'janesmith',
  //     handValue: 21,
  //     winnings: 400
  //   },
  //   results: [
  //     {
  //       userId: '507f1f77bcf86cd799439011',
  //       username: 'janesmith',
  //       handValue: 21,
  //       status: 'WON',
  //       winnings: 400
  //     },
  //     {
  //       userId: '507f1f77bcf86cd799439010',
  //       username: 'johndoe',
  //       handValue: 19,
  //       status: 'LOST',
  //       winnings: 0
  //     },
  //     {
  //       userId: '507f1f77bcf86cd799439012',
  //       username: 'mike23',
  //       handValue: 23,
  //       status: 'BUST',
  //       winnings: 0
  //     }
  //   ],
  //   pot: 400,
  //   endedAt: '2024-12-14T10:45:00.000Z',
  //   duration: '10m 23s'
  // }
});
```

**Target:** All players in the room

---

#### player_disconnected

**Description:** A player disconnected during the game

**Receive:**

```javascript
socket.on("player_disconnected", (data) => {
  console.log(`${data.player.username} disconnected`);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   player: {
  //     userId: '507f1f77bcf86cd799439012',
  //     username: 'mike23'
  //   },
  //   status: 'WAITING_RECONNECT',  // or 'TIMEOUT'
  //   gracePeriod: 60,  // seconds to reconnect
  //   disconnectedAt: '2024-12-14T10:40:00.000Z'
  // }
});
```

**Target:** All other players in the room

---

#### player_reconnected

**Description:** A player reconnected after disconnection

**Receive:**

```javascript
socket.on("player_reconnected", (data) => {
  console.log(`${data.player.username} is back!`);
  // {
  //   roomId: '507f1f77bcf86cd799439020',
  //   player: {
  //     userId: '507f1f77bcf86cd799439012',
  //     username: 'mike23'
  //   },
  //   reconnectedAt: '2024-12-14T10:40:45.000Z',
  //   gameState: {
  //     currentTurn: '507f1f77bcf86cd799439011',
  //     yourCards: [ /* player's cards */ ],
  //     handValue: 15
  //   }
  // }
});
```

**Target:** All players in the room + Game state to reconnected player

---

## 3. CHAT EVENTS

### Client → Server Events

#### chat_message

**Description:** Send a chat message

**Emit:**

```javascript
// Text message
socket.emit(
  "chat_message",
  {
    roomId: "507f1f77bcf86cd799439020",
    messageType: "TEXT",
    content: "Hello everyone!",
  },
  (response) => {
    if (response.ok) {
      console.log("Message sent");
    } else {
      console.error("Error:", response.error);
    }
  }
);

// Quick message
socket.emit(
  "chat_message",
  {
    roomId: "507f1f77bcf86cd799439020",
    messageType: "QUICK_MESSAGE",
    quickMessageId: "QM_001", // "Good luck everyone!"
  },
  (response) => {
    console.log("Quick message sent");
  }
);
```

---

### Server → Client Events

#### chat_message

**Description:** Receive a chat message

**Receive:**

```javascript
socket.on("chat_message", (data) => {
  console.log(`${data.senderUsername}: ${data.content}`);
  // {
  //   messageId: 'msg_1703098745_abc123',
  //   roomId: '507f1f77bcf86cd799439020',
  //   senderId: '507f1f77bcf86cd799439010',
  //   senderUsername: 'johndoe',
  //   messageType: 'TEXT',
  //   content: 'Good luck everyone!',
  //   filtered: false,  // true if profanity filtered
  //   timestamp: '2024-12-14T10:30:00.000Z'
  // }
});
```

**Target:** All players in the room

---

#### user_muted

**Description:** You have been muted by an admin

**Receive:**

```javascript
socket.on("user_muted", (data) => {
  console.log("You have been muted:", data.reason);
  // {
  //   reason: 'Spamming chat',
  //   mutedUntil: '2024-12-14T11:30:00.000Z',
  //   duration: 3600  // seconds
  // }
});
```

**Target:** Muted user only

---

#### user_unmuted

**Description:** Your mute has been lifted

**Receive:**

```javascript
socket.on("user_unmuted", (data) => {
  console.log("You have been unmuted");
  // {
  //   message: 'You have been unmuted',
  //   unmutedAt: '2024-12-14T10:45:00.000Z'
  // }
});
```

**Target:** Unmuted user only

---

#### chat_error

**Description:** Error sending chat message

**Receive:**

```javascript
socket.on("chat_error", (data) => {
  console.error("Chat error:", data.message);
  // {
  //   error: 'CHAT_002',
  //   message: 'You are muted',
  //   mutedUntil: '2024-12-14T11:30:00.000Z'
  // }
});
```

**Target:** User who attempted to send message

---

## 4. FRIEND EVENTS

### Server → Client Events

#### friend_status_updated

**Description:** A friend's online status changed

**Receive:**

```javascript
socket.on("friend_status_updated", (data) => {
  console.log(`${data.username} is now ${data.status}`);
  // {
  //   userId: '507f1f77bcf86cd799439011',
  //   username: 'janesmith',
  //   status: 'ONLINE',  // or 'OFFLINE', 'IN_GAME'
  //   lastSeen: '2024-12-14T10:30:00.000Z',
  //   currentGame: '507f1f77bcf86cd799439020'  // if IN_GAME
  // }
});
```

**Target:** All friends of the user

---

#### friend_request_received

**Description:** You received a new friend request

**Receive:**

```javascript
socket.on("friend_request_received", (data) => {
  console.log(`Friend request from ${data.from.username}`);
  // {
  //   requestId: '507f1f77bcf86cd799439600',
  //   from: {
  //     userId: '507f1f77bcf86cd799439012',
  //     username: 'mike23',
  //     profilePicture: 'https://...'
  //   },
  //   createdAt: '2024-12-14T10:30:00.000Z'
  // }
});
```

**Target:** Recipient of friend request

---

## 5. NOTIFICATION EVENTS

### Server → Client Events

#### notification

**Description:** New notification received

**Receive:**

```javascript
socket.on("notification", (data) => {
  console.log("New notification:", data.message);
  // {
  //   notificationId: '507f1f77bcf86cd799439700',
  //   type: 'GAME_RESULT',
  //   title: 'Game Completed',
  //   message: 'You won 400 coins in Classic Mode!',
  //   priority: 'HIGH',
  //   data: {
  //     roomId: '507f1f77bcf86cd799439020',
  //     winnings: 400,
  //     gameMode: 'CLASSIC'
  //   },
  //   createdAt: '2024-12-14T10:45:00.000Z',
  //   read: false
  // }
});
```

**Notification Types:**

- `GAME_RESULT` - Game completed
- `FRIEND_REQUEST` - New friend request
- `FRIEND_ACCEPTED` - Friend request accepted
- `LEVEL_UP` - Player leveled up
- `ACHIEVEMENT` - New achievement unlocked
- `PAYMENT_SUCCESS` - Deposit successful
- `WITHDRAWAL_STATUS` - Withdrawal status update
- `PROMOTION` - Promotional offer
- `ADMIN_MESSAGE` - Message from admin
- `SYSTEM_ALERT` - System maintenance/update
- `LOW_BALANCE` - Low wallet balance warning
- `INACTIVITY` - Inactivity reminder

**Target:** Specific user

---

#### notification_updated

**Description:** Notification marked as read

**Receive:**

```javascript
socket.on("notification_updated", (data) => {
  console.log("Notification updated:", data.notificationId);
  // {
  //   notificationId: '507f1f77bcf86cd799439700',
  //   read: true,
  //   readAt: '2024-12-14T10:46:00.000Z'
  // }
});
```

**Target:** Specific user

---

## 6. ADMIN EVENTS

### Server → Client Events

#### player_banned

**Description:** You have been banned

**Receive:**

```javascript
socket.on("player_banned", (data) => {
  console.log("Account banned:", data.reason);
  // {
  //   reason: 'Cheating detected',
  //   bannedBy: 'admin',
  //   duration: 'permanent',  // or '7d', '30d', etc.
  //   bannedAt: '2024-12-14T10:30:00.000Z',
  //   bannedUntil: null  // null for permanent
  // }

  // Force disconnect
  socket.disconnect();
});
```

**Target:** Banned player

---

## Complete Example: Game Flow

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: { token: "YOUR_JWT_TOKEN" },
});

// 1. Create a room
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
    if (response.ok) {
      const roomId = response.room._id;
      console.log("Room created:", roomId);

      // Listen for players joining
      socket.on("player_joined", (data) => {
        console.log(
          `${data.player.username} joined (${data.currentPlayers}/${data.maxPlayers})`
        );
      });

      // Game starts when full
      socket.on("game_started", (data) => {
        console.log("Game starting!");
        console.log("Your cards:", data.cards);
        console.log("Turn order:", data.turnOrder);
      });

      // Listen for turn changes
      socket.on("turn_changed", (data) => {
        if (data.currentPlayer.userId === myUserId) {
          console.log("It's my turn!");

          // Flip first card
          socket.emit(
            "flip_card",
            {
              roomId: roomId,
              cardPosition: 0,
            },
            (response) => {
              console.log("Card flipped:", response.card);
              console.log("Hand value:", response.handValue);
            }
          );
        }
      });

      // Listen for other players' flips
      socket.on("card_flipped", (data) => {
        console.log(
          `${data.player.username} flipped ${data.card.rank}${data.card.suit}`
        );
        console.log("Status:", data.status);
      });

      // Chat
      socket.on("chat_message", (data) => {
        console.log(`${data.senderUsername}: ${data.content}`);
      });

      // Game ends
      socket.on("game_ended", (data) => {
        console.log("Winner:", data.winner.username);
        console.log(
          "Your winnings:",
          data.results.find((r) => r.userId === myUserId).winnings
        );
      });
    }
  }
);
```

---

## Error Handling

All Socket.IO event callbacks follow this pattern:

```javascript
socket.emit("event_name", payload, (response) => {
  if (response.ok) {
    // Success
    console.log(response.data);
  } else {
    // Error
    console.error("Error code:", response.error);
    console.error("Message:", response.message);
  }
});
```

**Common Error Codes:**

- `AUTH_ERROR` - Authentication failed
- `ROOM_ERROR` - Room-related error
- `GAME_ERROR` - Game-related error
- `CHAT_ERROR` - Chat-related error
- `RATE_LIMIT` - Too many requests
- `INVALID_DATA` - Invalid payload
- `SERVER_ERROR` - Internal server error

---

## Best Practices

### 1. Always Handle Errors

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
  // Show user-friendly error message
});
```

### 2. Implement Reconnection Logic

```javascript
socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    // Server disconnected, try to reconnect
    socket.connect();
  }
  // else socket will automatically try to reconnect
});

socket.on("reconnect", (attemptNumber) => {
  console.log("Reconnected after", attemptNumber, "attempts");
  // Re-sync game state
});
```

### 3. Clean Up Event Listeners

```javascript
// When leaving a page/component
function cleanup() {
  socket.off("player_joined");
  socket.off("game_started");
  socket.off("card_flipped");
  // ... other events
}
```

### 4. Use Room-Specific Listeners

```javascript
function joinRoom(roomId) {
  socket.join(roomId);

  // Set up room-specific listeners
  socket.on(`room:${roomId}:update`, handleRoomUpdate);
}

function leaveRoom(roomId) {
  socket.leave(roomId);

  // Clean up room-specific listeners
  socket.off(`room:${roomId}:update`, handleRoomUpdate);
}
```

---

## Testing Socket.IO Events

### Using socket.io-client (Node.js)

```javascript
const io = require("socket.io-client");

const socket = io("http://localhost:3000", {
  auth: { token: "TEST_JWT_TOKEN" },
});

socket.on("connect", () => {
  console.log("Connected");

  // Test creating a room
  socket.emit(
    "create_room",
    {
      roomType: "PUBLIC",
      maxPlayers: 2,
      entryFee: 10,
      gameMode: "CLASSIC",
      gameLength: "SHORT",
    },
    (response) => {
      console.log("Room created:", response);
    }
  );
});
```

### Using Postman (WebSocket)

1. Open Postman
2. New → WebSocket Request
3. URL: `ws://localhost:3000/socket.io/?EIO=4&transport=websocket`
4. Connect
5. Send events in Socket.IO format

### Browser Console Testing

```javascript
// Load socket.io-client in browser
const script = document.createElement("script");
script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
document.head.appendChild(script);

// After loaded
const socket = io("http://localhost:3000", {
  auth: { token: "YOUR_TOKEN" },
});

socket.on("connect", () => console.log("Connected"));
socket.emit(
  "create_room",
  {
    /* ... */
  },
  console.log
);
```

---

## Rate Limits

- **Chat messages:** 10 per minute
- **Friend requests:** 20 per day
- **Room creation:** 10 per hour
- **General events:** 100 per minute

Exceeding rate limits results in:

- `RATE_LIMIT` error
- Temporary throttling (30-300 seconds)
- Repeat offenders: Automatic ban

---

## Security Notes

1. **Authentication:** All connections require valid JWT
2. **Room Authorization:** Players can only interact with rooms they've joined
3. **Turn Validation:** Server validates it's actually your turn before accepting flip_card
4. **Input Sanitization:** All data sanitized server-side
5. **Rate Limiting:** Per-user rate limits enforced
6. **Profanity Filter:** Chat messages filtered automatically
