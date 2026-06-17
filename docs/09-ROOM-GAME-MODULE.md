# Room & Game Module API Documentation

## Base URLs

```
Room: /api/v1/room
Game: /api/v1/game
```

---

## ROOM MODULE

### 1. Create Room

**POST** `/api/v1/room/create`

**Description:** Create a new game room

**Authentication:** Required (JWT Token)

**Middleware:** requireModeSelection (user must select game mode first)

**Request Body:**

```json
{
  "roomType": "PUBLIC",
  "maxPlayers": 4,
  "entryFee": 100,
  "gameMode": "CLASSIC",
  "gameLength": "MEDIUM"
}
```

**Validation Rules:**

- `roomType`: Required, enum: "PUBLIC", "PRIVATE", "SCHEDULED"
- `maxPlayers`: Required, number, min: 2, max: 6
- `entryFee`: Required, number, min: 10, max: 10000
- `gameMode`: Required, enum: "CLASSIC", "SPEED", "TOURNAMENT"
- `gameLength`: Required, enum: "SHORT", "MEDIUM", "LONG"

**Success Response (201):**

```json
{
  "message": "Room created successfully",
  "data": {
    "roomId": "507f1f77bcf86cd799439020",
    "roomCode": "ABC123",
    "roomType": "PUBLIC",
    "gameMode": "CLASSIC",
    "gameLength": "MEDIUM",
    "maxPlayers": 4,
    "currentPlayers": 1,
    "entryFee": 100,
    "maxWinningAmount": 400,
    "status": "WAITING",
    "hostId": "507f1f77bcf86cd799439010",
    "players": [
      {
        "userId": "507f1f77bcf86cd799439010",
        "username": "johndoe",
        "joinedAt": "2024-12-14T10:30:00.000Z",
        "status": "CONNECTED"
      }
    ],
    "createdAt": "2024-12-14T10:30:00.000Z"
  }
}
```

**Socket Event Emitted:** `room_created` (broadcast to lobby)

---

### 2. Join Room

**POST** `/api/v1/room/join`

**Description:** Join an existing room (supports MATCHMAKING, ROOM_CODE, INVITATION)

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "joinMethod": "ROOM_CODE",
  "code": "ABC123"
}
```

**Join Methods:**

**ROOM_CODE:**

```json
{
  "joinMethod": "ROOM_CODE",
  "code": "ABC123"
}
```

**MATCHMAKING:**

```json
{
  "joinMethod": "MATCHMAKING",
  "gameLength": "MEDIUM",
  "betMultiplier": 1.0,
  "maxPlayers": 4
}
```

**ROOM_ID (Direct):**

```json
{
  "joinMethod": "ROOM_ID",
  "roomId": "507f1f77bcf86cd799439020"
}
```

**Success Response (200):**

```json
{
  "message": "Joined room successfully",
  "data": {
    "roomId": "507f1f77bcf86cd799439020",
    "roomCode": "ABC123",
    "gameMode": "CLASSIC",
    "currentPlayers": 2,
    "maxPlayers": 4,
    "entryFee": 100,
    "status": "WAITING",
    "players": [
      {
        "userId": "507f1f77bcf86cd799439010",
        "username": "johndoe",
        "status": "CONNECTED"
      },
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "janesmith",
        "status": "CONNECTED"
      }
    ]
  }
}
```

**Socket Event Emitted:** `player_joined` (to all players in room)

---

### 3. List Available Rooms

**GET** `/api/v1/room/list`

**Description:** Get list of available rooms to join

**Authentication:** Required (JWT Token)

**Query Parameters:**

- `gameMode`: Filter by game mode - optional
- `gameLength`: Filter by game length - optional
- `minEntryFee`: Minimum entry fee - optional
- `maxEntryFee`: Maximum entry fee - optional
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Success Response (200):**

```json
{
  "message": "Rooms retrieved successfully",
  "data": {
    "rooms": [
      {
        "roomId": "507f1f77bcf86cd799439020",
        "roomCode": "ABC123",
        "roomType": "PUBLIC",
        "gameMode": "CLASSIC",
        "gameLength": "MEDIUM",
        "currentPlayers": 2,
        "maxPlayers": 4,
        "entryFee": 100,
        "maxWinningAmount": 400,
        "status": "WAITING",
        "hostUsername": "johndoe",
        "createdAt": "2024-12-14T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

### 4. Get Room by ID

**GET** `/api/v1/room/:id`

**Description:** Get detailed information about a specific room

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `id`: Room ID

**Success Response (200):**

```json
{
  "message": "Room retrieved successfully",
  "data": {
    "roomId": "507f1f77bcf86cd799439020",
    "roomCode": "ABC123",
    "roomType": "PUBLIC",
    "gameMode": "CLASSIC",
    "gameLength": "MEDIUM",
    "maxPlayers": 4,
    "currentPlayers": 3,
    "entryFee": 100,
    "maxWinningAmount": 400,
    "status": "WAITING",
    "hostId": "507f1f77bcf86cd799439010",
    "players": [
      {
        "userId": "507f1f77bcf86cd799439010",
        "username": "johndoe",
        "joinedAt": "2024-12-14T10:30:00.000Z",
        "status": "CONNECTED"
      },
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "janesmith",
        "joinedAt": "2024-12-14T10:31:00.000Z",
        "status": "CONNECTED"
      },
      {
        "userId": "507f1f77bcf86cd799439012",
        "username": "mike23",
        "joinedAt": "2024-12-14T10:32:00.000Z",
        "status": "CONNECTED"
      }
    ],
    "createdAt": "2024-12-14T10:30:00.000Z",
    "startedAt": null
  }
}
```

---

## GAME MODULE

### 5. Start Game

**POST** `/api/v1/game/start/:roomId`

**Description:** Manually start a game (host only). Auto-starts when room reaches maxPlayers.

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `roomId`: Room ID

**Authorization:** Only host can manually start (or auto-start when full)

**Success Response (200):**

```json
{
  "message": "Game started successfully",
  "data": {
    "roomId": "507f1f77bcf86cd799439020",
    "status": "IN_PROGRESS",
    "startedAt": "2024-12-14T10:35:00.000Z",
    "currentRound": 1,
    "currentTurn": "507f1f77bcf86cd799439010",
    "pot": 400,
    "playerTurnOrder": [
      "507f1f77bcf86cd799439010",
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]
  }
}
```

**Socket Event Emitted:** `game_started` (to all players in room)

---

### 6. Get Game State

**GET** `/api/v1/game/:roomId/state`

**Description:** Get current game state (for debugging/UI sync)

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `roomId`: Room ID

**Success Response (200):**

```json
{
  "message": "Game state retrieved successfully",
  "data": {
    "roomId": "507f1f77bcf86cd799439020",
    "status": "IN_PROGRESS",
    "currentRound": 2,
    "currentTurn": "507f1f77bcf86cd799439011",
    "pot": 400,
    "players": [
      {
        "userId": "507f1f77bcf86cd799439010",
        "username": "johndoe",
        "cards": 5,
        "handValue": 0,
        "status": "ACTIVE",
        "isMyTurn": false
      },
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "janesmith",
        "cards": 5,
        "handValue": 0,
        "status": "ACTIVE",
        "isMyTurn": true
      }
    ],
    "cardsRemaining": 40,
    "lastAction": "FLIP_CARD"
  }
}
```

---

### 7. Get Player Cards

**GET** `/api/v1/game/:roomId/cards`

**Description:** Get current player's cards (for testing/debugging)

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `roomId`: Room ID

**Success Response (200):**

```json
{
  "message": "Player cards retrieved successfully",
  "data": {
    "cards": [
      {
        "rank": "A",
        "suit": "♠",
        "value": 11,
        "flipped": false,
        "position": 0
      },
      {
        "rank": "K",
        "suit": "♥",
        "value": 10,
        "flipped": true,
        "position": 1
      },
      {
        "rank": "7",
        "suit": "♣",
        "value": 7,
        "flipped": false,
        "position": 2
      }
    ],
    "totalCards": 5,
    "flippedCards": 1,
    "handValue": 10
  }
}
```

---

### 8. Request Flip Out of Turn

**POST** `/api/v1/game/flip-request`

**Description:** Bid to flip a card out of turn (bidding system)

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "roomId": "507f1f77bcf86cd799439020",
  "bidAmount": 50
}
```

**Validation Rules:**

- `roomId`: Required, valid MongoDB ObjectId
- `bidAmount`: Required, number, min: 1

**Success Response (200):**

```json
{
  "message": "Flip request submitted successfully",
  "data": {
    "requestId": "507f1f77bcf86cd799439500",
    "roomId": "507f1f77bcf86cd799439020",
    "requestedBy": "507f1f77bcf86cd799439011",
    "bidAmount": 50,
    "status": "PENDING",
    "expiresAt": "2024-12-14T10:36:00.000Z"
  }
}
```

**Socket Event Emitted:** `flip_request_received` (to all players)

---

### 9. Get Active Flip Request

**GET** `/api/v1/game/flip-request/:roomId`

**Description:** Get current active flip request for a room

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `roomId`: Room ID

**Success Response (200):**

```json
{
  "message": "Active flip request retrieved successfully",
  "data": {
    "requestId": "507f1f77bcf86cd799439500",
    "roomId": "507f1f77bcf86cd799439020",
    "requestedBy": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "janesmith"
    },
    "bidAmount": 50,
    "status": "PENDING",
    "currentHighestBid": 50,
    "expiresAt": "2024-12-14T10:36:00.000Z",
    "remainingSeconds": 45
  }
}
```

---

### 10. Get Game Scores

**GET** `/api/v1/game/:roomId/scores`

**Description:** Get current scores for all players in the game

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `roomId`: Room ID

**Success Response (200):**

```json
{
  "message": "Game scores retrieved successfully",
  "data": {
    "roomId": "507f1f77bcf86cd799439020",
    "currentRound": 3,
    "scores": [
      {
        "userId": "507f1f77bcf86cd799439010",
        "username": "johndoe",
        "handValue": 18,
        "status": "ACTIVE",
        "flippedCards": 3,
        "totalCards": 5
      },
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "janesmith",
        "handValue": 21,
        "status": "BUST",
        "flippedCards": 4,
        "totalCards": 5
      }
    ]
  }
}
```

---

## Socket.IO Events

### Events Sent by Client

**1. create_room**

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
    }
  }
);
```

**2. join_room**

```javascript
socket.emit(
  "join_room",
  {
    joinMethod: "ROOM_CODE",
    code: "ABC123",
  },
  (response) => {
    if (response.ok) {
      console.log("Joined room:", response.room);
    }
  }
);
```

**3. leave_room**

```javascript
socket.emit(
  "leave_room",
  {
    roomId: "507f1f77bcf86cd799439020",
  },
  (response) => {
    console.log("Left room");
  }
);
```

**4. flip_card**

```javascript
socket.emit(
  "flip_card",
  {
    roomId: "507f1f77bcf86cd799439020",
    cardPosition: 0,
  },
  (response) => {
    if (response.ok) {
      console.log("Card flipped:", response.card);
    }
  }
);
```

**5. respond_to_flip_request**

```javascript
socket.emit(
  "respond_to_flip_request",
  {
    requestId: "507f1f77bcf86cd799439500",
    action: "ACCEPT", // or 'REJECT' or 'COUNTER_BID'
    counterBidAmount: 75, // if COUNTER_BID
  },
  (response) => {
    console.log("Response submitted");
  }
);
```

---

### Events Received by Client

**1. room_created**

```javascript
socket.on("room_created", (data) => {
  // Broadcast to lobby when new room is created
  console.log("New room available:", data);
});
```

**2. player_joined**

```javascript
socket.on("player_joined", (data) => {
  // Emitted to all players in room when someone joins
  console.log(`${data.player.username} joined the room`);
  console.log(`Players: ${data.currentPlayers}/${data.maxPlayers}`);
});
```

**3. player_left**

```javascript
socket.on("player_left", (data) => {
  console.log(`${data.player.username} left the room`);
  console.log(`Players: ${data.currentPlayers}/${data.maxPlayers}`);
});
```

**4. game_started**

```javascript
socket.on("game_started", (data) => {
  console.log("Game has started!");
  console.log("Your turn order:", data.turnOrder);
  console.log("Cards dealt:", data.cards);
});
```

**5. turn_changed**

```javascript
socket.on("turn_changed", (data) => {
  console.log(`Now it's ${data.currentPlayer.username}'s turn`);
  console.log("Time remaining:", data.timeRemaining);
});
```

**6. card_flipped**

```javascript
socket.on("card_flipped", (data) => {
  console.log(`${data.player.username} flipped a card`);
  console.log("Card:", data.card);
  console.log("New hand value:", data.newHandValue);
  console.log("Status:", data.status); // 'SAFE', 'BUST', 'BLACKJACK'
});
```

**7. flip_request_received**

```javascript
socket.on("flip_request_received", (data) => {
  console.log(`${data.player.username} wants to flip out of turn`);
  console.log("Bid amount:", data.bidAmount);
  console.log("Time to respond:", data.expiresAt);
});
```

**8. game_ended**

```javascript
socket.on("game_ended", (data) => {
  console.log("Game ended!");
  console.log("Winner:", data.winner);
  console.log("Results:", data.results);
  console.log("Winnings distributed:", data.settlements);
});
```

**9. player_disconnected**

```javascript
socket.on("player_disconnected", (data) => {
  console.log(`${data.player.username} disconnected`);
  console.log("Status:", data.status); // 'WAITING_RECONNECT', 'TIMEOUT'
});
```

**10. player_reconnected**

```javascript
socket.on("player_reconnected", (data) => {
  console.log(`${data.player.username} reconnected`);
});
```

---

## Game Flow

### 1. Create/Join Room Flow

```
1. Player creates room OR joins via code/matchmaking
2. Entry fee deducted from wallet
3. Player waits in lobby (WAITING status)
4. When maxPlayers reached OR host starts:
   → Game auto-starts
5. Cards dealt to all players
6. Turn order determined
```

### 2. Gameplay Flow

```
1. Game starts → status: IN_PROGRESS
2. First player's turn (60s timer)
3. Player flips a card:
   - Card revealed
   - Hand value updated
   - Status checked (SAFE, BUST, BLACKJACK)
4. Turn moves to next player
5. Repeat until all players bust or pass
6. Winner determined (highest hand ≤ 21)
7. Pot distributed
8. Game ends → status: ENDED
```

### 3. Flip Request (Bidding) Flow

```
1. Player not in turn requests flip
2. Bid amount submitted (min: 1 coin)
3. All players notified (30s to respond)
4. Other players can:
   - ACCEPT → Requester flips
   - REJECT → Request denied
   - COUNTER_BID → Higher bid to flip instead
5. Highest bidder wins flip right
6. Bid amount added to pot
```

---

## Room Status Values

| Status        | Description                         |
| ------------- | ----------------------------------- |
| `WAITING`     | Room created, waiting for players   |
| `IN_PROGRESS` | Game is active                      |
| `ENDED`       | Game completed                      |
| `CANCELLED`   | Room cancelled (not enough players) |

---

## Player Status Values

| Status         | Description                     |
| -------------- | ------------------------------- |
| `CONNECTED`    | Player online and in room       |
| `DISCONNECTED` | Player temporarily disconnected |
| `LEFT`         | Player permanently left         |
| `BUST`         | Player exceeded 21 (eliminated) |
| `ACTIVE`       | Player still in game            |
| `WINNER`       | Player won the game             |

---

## Error Codes

| Code       | Message                 |
| ---------- | ----------------------- |
| `ROOM_001` | Room not found          |
| `ROOM_002` | Room is full            |
| `ROOM_003` | Insufficient balance    |
| `ROOM_004` | Already in a room       |
| `ROOM_005` | Invalid room code       |
| `ROOM_006` | Game already started    |
| `ROOM_007` | Not room host           |
| `ROOM_008` | Minimum players not met |
| `GAME_001` | Not your turn           |
| `GAME_002` | Invalid card position   |
| `GAME_003` | Card already flipped    |
| `GAME_004` | Game not in progress    |
| `GAME_005` | Player not in room      |

---

## Example Usage (cURL)

### Create Room:

```bash
curl -X POST http://localhost:3000/api/v1/room/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomType": "PUBLIC",
    "maxPlayers": 4,
    "entryFee": 100,
    "gameMode": "CLASSIC",
    "gameLength": "MEDIUM"
  }'
```

### Join Room by Code:

```bash
curl -X POST http://localhost:3000/api/v1/room/join \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "joinMethod": "ROOM_CODE",
    "code": "ABC123"
  }'
```

### List Rooms:

```bash
curl -X GET "http://localhost:3000/api/v1/room/list?gameMode=CLASSIC&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Start Game:

```bash
curl -X POST http://localhost:3000/api/v1/game/start/507f1f77bcf86cd799439020 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Game State:

```bash
curl -X GET http://localhost:3000/api/v1/game/507f1f77bcf86cd799439020/state \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Room Creation:**

   - Create PUBLIC room → Success, room code generated ✓
   - Create PRIVATE room → Success, only code/invite join ✓
   - Create with insufficient balance → ROOM_003 error ✓
   - room_created event broadcast to lobby ✓

2. **Join Room:**

   - Join via valid code → Success ✓
   - Join via invalid code → ROOM_005 error ✓
   - Join full room → ROOM_002 error ✓
   - player_joined event to all in room ✓
   - Entry fee deducted ✓

3. **Matchmaking:**

   - Request matchmaking → Waiting status ✓
   - Second player joins → Room created ✓
   - Timeout (no match) → Entry fee refunded ✓

4. **Game Start:**

   - Auto-start when full → game_started event ✓
   - Host manually starts → Works ✓
   - Non-host tries to start → ROOM_007 error ✓
   - Cards dealt to all players ✓

5. **Card Flipping:**

   - Flip on my turn → card_flipped event ✓
   - Flip out of turn → GAME_001 error ✓
   - Flip already flipped card → GAME_003 error ✓
   - Hand value updates correctly ✓
   - Bust at 22+ → Player eliminated ✓

6. **Flip Request (Bidding):**

   - Submit flip request → flip_request_received ✓
   - Accept bid → Requester flips ✓
   - Counter-bid → Higher bidder flips ✓
   - Timeout → Request expired ✓
   - Bid added to pot ✓

7. **Game Ending:**

   - All players bust → Last player wins ✓
   - Highest ≤21 wins → Correct winner ✓
   - Pot distributed correctly ✓
   - game_ended event sent ✓
   - GameResult recorded ✓

8. **Disconnection Handling:**

   - Player disconnects → 60s grace period ✓
   - Reconnects in time → Game continues ✓
   - Timeout → Player auto-folded ✓
   - All disconnect → Game cancelled ✓

9. **Edge Cases:**
   - Room expires (no players) → Auto-cancelled ✓
   - Player leaves before start → Entry fee refunded ✓
   - Player leaves during game → Eliminated, bet lost ✓
   - Blackjack (21) → Instant win bonus ✓
