# Admin Panel Module API Documentation

## Base URL

```
/api/v1/admin
```

**Authentication:** All endpoints require JWT Token + ADMIN or SUPER_ADMIN role

**Authorization Middleware:** `authMiddleware + role(['ADMIN', 'SUPER_ADMIN'])`

---

## REST Endpoints

### 1. Get Active Games

**GET** `/api/v1/admin/games/active`

**Description:** Get list of all currently active games across all rooms

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)
- `gameMode`: Filter by game mode (CLASSIC, SPEED, TOURNAMENT) - optional

**Success Response (200):**

```json
{
  "message": "Active games retrieved successfully",
  "data": {
    "games": [
      {
        "roomId": "507f1f77bcf86cd799439020",
        "roomName": "High Stakes Room",
        "gameMode": "CLASSIC",
        "players": [
          {
            "userId": "507f1f77bcf86cd799439010",
            "username": "johndoe",
            "balance": 5000,
            "currentBet": 100
          },
          {
            "userId": "507f1f77bcf86cd799439011",
            "username": "janesmith",
            "balance": 4500,
            "currentBet": 100
          }
        ],
        "pot": 200,
        "roundNumber": 3,
        "status": "IN_PROGRESS",
        "startedAt": "2024-12-14T10:30:00.000Z",
        "duration": "5m 42s"
      }
    ],
    "totalGames": 15,
    "totalPlayers": 28,
    "totalPot": 45000,
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

### 2. Ban Player

**POST** `/api/v1/admin/players/:userId/ban`

**Description:** Ban a player from the platform

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**URL Parameters:**

- `userId`: User ID to ban

**Request Body:**

```json
{
  "reason": "Cheating detected",
  "duration": "permanent"
}
```

**Validation Rules:**

- `reason`: Required, string, max 500 characters
- `duration`: Required, enum: "1h", "24h", "7d", "30d", "permanent"

**Success Response (200):**

```json
{
  "message": "Player banned successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "cheater123",
    "banned": true,
    "bannedBy": "507f1f77bcf86cd799439001",
    "bannedByUsername": "admin",
    "reason": "Cheating detected",
    "bannedAt": "2024-12-14T10:30:00.000Z",
    "bannedUntil": null,
    "duration": "permanent"
  }
}
```

**Side Effects:**

- User is kicked from any active game
- All pending transactions are cancelled
- User cannot login until unbanned
- AdminAuditLog entry created
- Notification sent to banned user

---

### 3. Unban Player

**POST** `/api/v1/admin/players/:userId/unban`

**Description:** Remove ban from a player

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**URL Parameters:**

- `userId`: User ID to unban

**Request Body:** (No body required)

**Success Response (200):**

```json
{
  "message": "Player unbanned successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "cheater123",
    "banned": false,
    "unbannedBy": "507f1f77bcf86cd799439001",
    "unbannedByUsername": "admin",
    "unbannedAt": "2024-12-14T11:00:00.000Z"
  }
}
```

**Side Effects:**

- User can login again
- AdminAuditLog entry created
- Notification sent to unbanned user

---

### 4. Issue Refund

**POST** `/api/v1/admin/refunds/issue`

**Description:** Manually issue a refund to a player

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**Request Body:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "amount": 500,
  "reason": "Game crash compensation",
  "gameResultId": "507f1f77bcf86cd799439099"
}
```

**Validation Rules:**

- `userId`: Required, valid MongoDB ObjectId
- `amount`: Required, number, min: 1, max: 10000
- `reason`: Required, string, max 500 characters
- `gameResultId`: Optional, valid MongoDB ObjectId (for reference)

**Success Response (200):**

```json
{
  "message": "Refund issued successfully",
  "data": {
    "transactionId": "507f1f77bcf86cd799439200",
    "userId": "507f1f77bcf86cd799439011",
    "username": "janesmith",
    "amount": 500,
    "reason": "Game crash compensation",
    "issuedBy": "507f1f77bcf86cd799439001",
    "issuedByUsername": "admin",
    "issuedAt": "2024-12-14T10:35:00.000Z",
    "newBalance": 5500,
    "previousBalance": 5000
  }
}
```

**Side Effects:**

- Transaction record created (type: REFUND)
- User wallet balance increased
- AdminAuditLog entry created
- Notification sent to user

---

### 5. Get Dashboard Analytics

**GET** `/api/v1/admin/analytics/dashboard`

**Description:** Get comprehensive analytics for admin dashboard

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**Query Parameters:**

- `period`: Time period (1h, 24h, 7d, 30d, all) - default: 24h
- `timezone`: Timezone offset (e.g., "+05:30") - optional

**Success Response (200):**

```json
{
  "message": "Dashboard analytics retrieved successfully",
  "data": {
    "period": "24h",
    "generatedAt": "2024-12-14T10:30:00.000Z",
    "overview": {
      "totalUsers": 15234,
      "activeUsers": 2456,
      "newUsers": 145,
      "bannedUsers": 23
    },
    "games": {
      "totalGames": 8542,
      "activeGames": 45,
      "completedGames": 8497,
      "averageGameDuration": "12m 35s"
    },
    "revenue": {
      "totalDeposits": 125450.0,
      "totalWithdrawals": 87320.5,
      "netRevenue": 38129.5,
      "pendingWithdrawals": 5240.0
    },
    "transactions": {
      "deposits": 1245,
      "withdrawals": 456,
      "refunds": 12,
      "failures": 8
    },
    "topPlayers": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "proPlayer",
        "gamesPlayed": 245,
        "totalWinnings": 12450.0,
        "winRate": 58.5
      }
    ],
    "systemHealth": {
      "activeRooms": 45,
      "averageResponseTime": "124ms",
      "errorRate": 0.3,
      "uptime": "99.98%"
    }
  }
}
```

---

### 6. Resolve Dispute

**POST** `/api/v1/admin/disputes/resolve`

**Description:** Resolve a player dispute or complaint

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**Request Body:**

```json
{
  "gameResultId": "507f1f77bcf86cd799439099",
  "userId": "507f1f77bcf86cd799439011",
  "resolution": "REFUND",
  "amount": 100,
  "notes": "Game server crashed during final round. Issuing full refund."
}
```

**Validation Rules:**

- `gameResultId`: Required, valid MongoDB ObjectId
- `userId`: Required, valid MongoDB ObjectId
- `resolution`: Required, enum: "REFUND", "COMPENSATE", "REJECT", "ADJUST_RESULT"
- `amount`: Required if resolution is REFUND or COMPENSATE, number, min: 0
- `notes`: Required, string, max 1000 characters

**Success Response (200):**

```json
{
  "message": "Dispute resolved successfully",
  "data": {
    "disputeId": "507f1f77bcf86cd799439300",
    "gameResultId": "507f1f77bcf86cd799439099",
    "userId": "507f1f77bcf86cd799439011",
    "username": "janesmith",
    "resolution": "REFUND",
    "amount": 100,
    "notes": "Game server crashed during final round. Issuing full refund.",
    "resolvedBy": "507f1f77bcf86cd799439001",
    "resolvedByUsername": "admin",
    "resolvedAt": "2024-12-14T10:40:00.000Z",
    "transactionId": "507f1f77bcf86cd799439201"
  }
}
```

**Side Effects:**

- GameResult may be updated
- Transaction created if refund/compensation
- AdminAuditLog entry created
- Notification sent to user
- User wallet updated

---

### 7. Search Players

**GET** `/api/v1/admin/players/search`

**Description:** Search for players by various criteria

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**Query Parameters:**

- `query`: Search term (username, email, userId) - required
- `status`: Filter by status (active, banned, suspended) - optional
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Success Response (200):**

```json
{
  "message": "Players found successfully",
  "data": {
    "players": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "username": "janesmith",
        "email": "jane@example.com",
        "status": "ACTIVE",
        "createdAt": "2024-11-01T08:00:00.000Z",
        "lastLogin": "2024-12-14T09:30:00.000Z",
        "stats": {
          "gamesPlayed": 125,
          "winRate": 54.3,
          "totalWinnings": 5240.0,
          "totalDeposits": 2000.0,
          "currentBalance": 5500.0
        },
        "kyc": {
          "level": "STANDARD",
          "status": "APPROVED"
        },
        "flags": {
          "banned": false,
          "verified": true,
          "fraud": false
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 8. Get Audit Logs

**GET** `/api/v1/admin/audit-logs`

**Description:** Get administrative action audit logs

**Authentication:** Required (ADMIN/SUPER_ADMIN)

**Query Parameters:**

- `action`: Filter by action (BAN, UNBAN, REFUND, RESOLVE_DISPUTE, etc.) - optional
- `adminId`: Filter by admin who performed action - optional
- `startDate`: Filter from date (ISO 8601) - optional
- `endDate`: Filter to date (ISO 8601) - optional
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 200)

**Success Response (200):**

```json
{
  "message": "Audit logs retrieved successfully",
  "data": {
    "logs": [
      {
        "logId": "507f1f77bcf86cd799439400",
        "adminId": "507f1f77bcf86cd799439001",
        "adminUsername": "admin",
        "action": "BAN_PLAYER",
        "targetUserId": "507f1f77bcf86cd799439011",
        "targetUsername": "cheater123",
        "details": {
          "reason": "Cheating detected",
          "duration": "permanent"
        },
        "ipAddress": "192.168.1.100",
        "timestamp": "2024-12-14T10:30:00.000Z"
      },
      {
        "logId": "507f1f77bcf86cd799439401",
        "adminId": "507f1f77bcf86cd799439001",
        "adminUsername": "admin",
        "action": "ISSUE_REFUND",
        "targetUserId": "507f1f77bcf86cd799439012",
        "targetUsername": "player456",
        "details": {
          "amount": 500,
          "reason": "Game crash compensation",
          "transactionId": "507f1f77bcf86cd799439200"
        },
        "ipAddress": "192.168.1.100",
        "timestamp": "2024-12-14T10:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1234,
      "totalPages": 25
    }
  }
}
```

---

## Error Codes

| Code        | Message                     |
| ----------- | --------------------------- |
| `ADMIN_001` | Insufficient permissions    |
| `ADMIN_002` | Player not found            |
| `ADMIN_003` | Player is already banned    |
| `ADMIN_004` | Player is not banned        |
| `ADMIN_005` | Invalid refund amount       |
| `ADMIN_006` | Game result not found       |
| `ADMIN_007` | Invalid dispute resolution  |
| `ADMIN_008` | Audit log not found         |
| `ADMIN_009` | Cannot ban admin user       |
| `ADMIN_010` | Refund amount exceeds limit |

---

## Admin Roles

### ADMIN

**Permissions:**

- View active games
- Ban/unban players
- Issue refunds (up to $1000)
- View analytics
- Resolve disputes
- Search players
- View audit logs

### SUPER_ADMIN

**All ADMIN permissions plus:**

- Issue unlimited refunds
- Manage other admins
- Access system configuration
- Export data
- Delete accounts

---

## Database Models

### AdminAuditLog

```typescript
{
  adminId: ObjectId,
  adminUsername: string,
  action: "BAN_PLAYER" | "UNBAN_PLAYER" | "ISSUE_REFUND" |
          "RESOLVE_DISPUTE" | "ADJUST_BALANCE" | "DELETE_ACCOUNT" |
          "UPDATE_USER" | "EXPORT_DATA" | "CONFIG_CHANGE",
  targetUserId: ObjectId,
  targetUsername: string,
  details: {
    reason?: string,
    amount?: number,
    duration?: string,
    previousValue?: any,
    newValue?: any,
    [key: string]: any
  },
  ipAddress: string,
  timestamp: Date,
  createdAt: Date
}
```

---

## Example Usage (cURL)

### Get Active Games:

```bash
curl -X GET "http://localhost:3000/api/v1/admin/games/active?page=1&limit=20&gameMode=CLASSIC" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Ban Player:

```bash
curl -X POST http://localhost:3000/api/v1/admin/players/507f1f77bcf86cd799439011/ban \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Cheating detected",
    "duration": "permanent"
  }'
```

### Issue Refund:

```bash
curl -X POST http://localhost:3000/api/v1/admin/refunds/issue \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "amount": 500,
    "reason": "Game crash compensation",
    "gameResultId": "507f1f77bcf86cd799439099"
  }'
```

### Get Dashboard Analytics:

```bash
curl -X GET "http://localhost:3000/api/v1/admin/analytics/dashboard?period=24h" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Search Players:

```bash
curl -X GET "http://localhost:3000/api/v1/admin/players/search?query=jane&status=active" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Get Audit Logs:

```bash
curl -X GET "http://localhost:3000/api/v1/admin/audit-logs?action=BAN_PLAYER&page=1&limit=50" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Admin Authentication:**

   - Access with PLAYER role → ADMIN_001 error ✓
   - Access with ADMIN role → Success ✓
   - Access with SUPER_ADMIN role → Success ✓

2. **Ban Player Flow:**

   - Ban active player → Player kicked from game ✓
   - Banned player tries to login → Error ✓
   - Ban already banned player → ADMIN_003 error ✓
   - Unban player → Player can login ✓
   - Audit log created for both actions ✓

3. **Refund System:**

   - Issue refund with valid amount → Wallet updated ✓
   - Refund amount > $10,000 → ADMIN_010 error ✓
   - User receives notification ✓
   - Transaction record created ✓
   - Audit log created ✓

4. **Dispute Resolution:**

   - Resolve with REFUND → Transaction created ✓
   - Resolve with COMPENSATE → Bonus added ✓
   - Resolve with REJECT → No wallet change ✓
   - Invalid game result → ADMIN_006 error ✓
   - Notification sent to user ✓

5. **Analytics Dashboard:**

   - 24h period → Shows last 24 hours ✓
   - 7d period → Shows last 7 days ✓
   - All period → Shows all time ✓
   - Data accuracy verified ✓

6. **Player Search:**

   - Search by username → Results found ✓
   - Search by email → Results found ✓
   - Search by userId → Results found ✓
   - Filter by status → Filtered correctly ✓
   - Pagination works ✓

7. **Audit Log Tracking:**

   - All admin actions logged ✓
   - Filter by action type → Works ✓
   - Filter by admin → Works ✓
   - Date range filter → Works ✓
   - IP address captured ✓

8. **Security:**
   - Non-admin cannot access → 403 Forbidden ✓
   - Cannot ban other admin → ADMIN_009 error ✓
   - Refund limit enforced for ADMIN role ✓
   - All sensitive actions logged ✓
