# Friends & Social Module API Documentation

## Base URL

```
/api/v1/friends
```

## Endpoints

### 1. Search Users

**POST** `/api/v1/friends/search`

**Description:** Search for users by username or email to add as friends

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "query": "john",
  "page": 1,
  "limit": 20
}
```

**Validation Rules:**

- `query`: Required, string, minimum 2 characters
- `page`: Optional, number, default 1
- `limit`: Optional, number, default 20, max 50

**Success Response (200):**

```json
{
  "message": "Users found successfully",
  "data": {
    "users": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "isOnline": true,
        "currentGameMode": "REAL_MONEY",
        "friendshipStatus": "NONE"
      },
      {
        "userId": "507f1f77bcf86cd799439012",
        "username": "johnsmith",
        "email": "smith@example.com",
        "isOnline": false,
        "friendshipStatus": "PENDING"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalUsers": 45,
      "limit": 20
    },
    "requestsRemainingToday": 18
  }
}
```

**Friendship Status Values:**

- `NONE` - No relationship
- `PENDING` - Request sent (by you or to you)
- `ACCEPTED` - Already friends
- `BLOCKED` - User blocked

---

### 2. Send Friend Request

**POST** `/api/v1/friends/request`

**Description:** Send friend request to another user

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "friendId": "507f1f77bcf86cd799439011"
}
```

**Success Response (201):**

```json
{
  "message": "Friend request sent successfully",
  "data": {
    "friendshipId": "friendship_1703098745_abc123",
    "userId": "507f1f77bcf86cd799439010",
    "friendId": "507f1f77bcf86cd799439011",
    "status": "PENDING",
    "requestedAt": "2024-12-14T10:30:00.000Z",
    "requestsRemainingToday": 19
  }
}
```

**Error Responses:**

- `400` - Cannot send request to yourself
- `400` - FRIEND_001: Already friends
- `400` - FRIEND_002: Request already pending
- `400` - FRIEND_004: Daily limit reached (20/day)
- `400` - FRIEND_005: Friend limit reached (500 max)
- `404` - FRIEND_006: User not found

---

### 3. Accept Friend Request

**POST** `/api/v1/friends/accept`

**Description:** Accept a pending friend request

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "friendshipId": "friendship_1703098745_abc123"
}
```

**Success Response (200):**

```json
{
  "message": "Friend request accepted",
  "data": {
    "friendshipId": "friendship_1703098745_abc123",
    "userId": "507f1f77bcf86cd799439010",
    "friendId": "507f1f77bcf86cd799439011",
    "status": "ACCEPTED",
    "acceptedAt": "2024-12-14T10:35:00.000Z",
    "friend": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "isOnline": true,
      "currentGameMode": "REAL_MONEY"
    }
  }
}
```

**Notifications Sent:**

- `FRIEND_REQUEST_ACCEPTED` notification sent to the requester
- Socket.IO event: `friend_status_updated`

---

### 4. Reject Friend Request

**POST** `/api/v1/friends/reject`

**Description:** Reject a pending friend request

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "friendshipId": "friendship_1703098745_abc123"
}
```

**Success Response (200):**

```json
{
  "message": "Friend request rejected",
  "data": {
    "friendshipId": "friendship_1703098745_abc123",
    "rejected": true
  }
}
```

---

### 5. Remove Friend

**DELETE** `/api/v1/friends/:friendId`

**Description:** Remove an existing friend from your friend list

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `friendId`: MongoDB ObjectId of the friend to remove

**Success Response (200):**

```json
{
  "message": "Friend removed successfully",
  "data": {
    "removedFriendId": "507f1f77bcf86cd799439011"
  }
}
```

---

### 6. Get Friend List

**GET** `/api/v1/friends/list`

**Description:** Get list of all accepted friends with online status

**Authentication:** Required (JWT Token)

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

**Success Response (200):**

```json
{
  "message": "Friends retrieved successfully",
  "data": {
    "friends": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "friendshipId": "friendship_1703098745_abc123",
        "isOnline": true,
        "currentGameMode": "REAL_MONEY",
        "inGame": true,
        "lastInteraction": "2024-12-14T09:00:00.000Z",
        "gamesPlayedTogether": 15,
        "friendSince": "2024-01-01T00:00:00.000Z"
      },
      {
        "userId": "507f1f77bcf86cd799439012",
        "username": "janesmith",
        "friendshipId": "friendship_1703098746_def456",
        "isOnline": false,
        "lastSeen": "2024-12-13T20:00:00.000Z",
        "gamesPlayedTogether": 8,
        "friendSince": "2024-02-15T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalFriends": 75,
      "limit": 50
    },
    "summary": {
      "totalFriends": 75,
      "onlineFriends": 23,
      "inGameFriends": 8
    }
  }
}
```

---

### 7. Get Friend Requests

**GET** `/api/v1/friends/requests`

**Description:** Get all pending friend requests (received and sent)

**Authentication:** Required (JWT Token)

**Success Response (200):**

```json
{
  "message": "Friend requests retrieved successfully",
  "data": {
    "received": [
      {
        "friendshipId": "friendship_1703098750_xyz789",
        "requesterId": "507f1f77bcf86cd799439015",
        "requesterUsername": "mikejones",
        "requestedAt": "2024-12-14T08:00:00.000Z"
      }
    ],
    "sent": [
      {
        "friendshipId": "friendship_1703098751_abc111",
        "recipientId": "507f1f77bcf86cd799439016",
        "recipientUsername": "sarahdavis",
        "requestedAt": "2024-12-14T07:00:00.000Z"
      }
    ],
    "counts": {
      "received": 3,
      "sent": 2
    }
  }
}
```

---

### 8. Get User Profile

**GET** `/api/v1/friends/profile/:userId`

**Description:** View another user's public profile

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `userId`: MongoDB ObjectId of the user

**Success Response (200):**

```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "isOnline": true,
    "currentGameMode": "REAL_MONEY",
    "inGame": true,
    "friendshipStatus": "ACCEPTED",
    "stats": {
      "totalGames": 245,
      "wins": 132,
      "losses": 113,
      "winRate": 53.88,
      "currentStreak": 5,
      "bestStreak": 12,
      "rank": 47
    },
    "badges": [
      {
        "id": "STREAK_5",
        "name": "Hot Streak",
        "description": "Win 5 games in a row",
        "icon": "🔥"
      }
    ],
    "gamesPlayedTogether": 15,
    "friendSince": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Redis Keys

### Online Status

```
Key: online:${userId}
Value: JSON {
  isOnline: boolean,
  currentGameMode: string,
  inGame: boolean,
  connectedAt: Date
}
TTL: 300 seconds (5 minutes, refreshed by heartbeat)
```

### Friend Request Rate Limit

```
Key: friendrequests:daily:${userId}
Value: count (integer)
TTL: 86400 seconds (24 hours)
```

---

## Error Codes

| Code         | Message                                     |
| ------------ | ------------------------------------------- |
| `FRIEND_001` | Already friends with this user              |
| `FRIEND_002` | Friend request already pending              |
| `FRIEND_003` | Cannot send friend request to this user     |
| `FRIEND_004` | Daily friend request limit reached (20/day) |
| `FRIEND_005` | Friend limit reached (500 max)              |
| `FRIEND_006` | User not found                              |
| `FRIEND_007` | Friend request not found                    |

---

## Constants

```typescript
MAX_FRIENDS = 500
DAILY_FRIEND_REQUEST_LIMIT = 20
FRIEND_SEARCH_LIMIT = 20
ONLINE_STATUS_TTL = 300 seconds
```

---

## Socket.IO Events

### Emitted by Server

**Event:** `friend_status_updated`
**Payload:**

```json
{
  "friendId": "507f1f77bcf86cd799439011",
  "status": "online|offline",
  "gameMode": "REAL_MONEY",
  "inGame": true
}
```

**Event:** `friend_request_received`
**Payload:**

```json
{
  "friendshipId": "friendship_1703098745_abc123",
  "requesterId": "507f1f77bcf86cd799439015",
  "requesterUsername": "mikejones",
  "requestedAt": "2024-12-14T08:00:00.000Z"
}
```

---

## Example Usage (cURL)

### Search Users:

```bash
curl -X POST http://localhost:3000/api/v1/friends/search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "john",
    "page": 1,
    "limit": 20
  }'
```

### Send Friend Request:

```bash
curl -X POST http://localhost:3000/api/v1/friends/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "friendId": "507f1f77bcf86cd799439011"
  }'
```

### Get Friend List:

```bash
curl -X GET "http://localhost:3000/api/v1/friends/list?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Friend Request within Daily Limit:**

   - Send 19 requests ✓
   - 20th request succeeds ✓
   - 21st request fails with FRIEND_004 ✓

2. **Friend Limit Enforcement:**

   - Add 499 friends ✓
   - 500th friend succeeds ✓
   - 501st request fails with FRIEND_005 ✓

3. **Bidirectional Friendship:**

   - User A sends request to User B ✓
   - User B sees request in received list ✓
   - User B accepts request ✓
   - Both users see each other in friend list ✓

4. **Online Status Updates:**

   - User comes online → Friends see status update ✓
   - User joins game → inGame flag set to true ✓
   - User disconnects → Status changes to offline after 5 min ✓

5. **Edge Cases:**
   - Cannot send request to yourself ✓
   - Cannot add same user twice ✓
   - Cannot accept request you didn't receive ✓
   - Block functionality works ✓
