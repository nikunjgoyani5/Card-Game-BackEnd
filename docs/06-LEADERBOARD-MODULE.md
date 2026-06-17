# Leaderboard & Statistics Module API Documentation

## Base URL

```
/api/v1/leaderboard
```

## Endpoints

### 1. Get Global Leaderboard

**GET** `/api/v1/leaderboard/global`

**Description:** Get global leaderboard rankings

**Authentication:** Optional (Public endpoint, but authenticated users get their rank)

**Query Parameters:**

- `period`: Required, enum: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME"
- `gameMode`: Required, enum: "FREE_COIN" | "REAL_MONEY"
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Success Response (200):**

```json
{
  "message": "Global leaderboard retrieved successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "507f1f77bcf86cd799439011",
        "username": "pokerpro23",
        "totalGames": 245,
        "totalWins": 156,
        "totalLosses": 89,
        "netProfit": 15420.5,
        "winRate": 63.67,
        "currentStreak": 8,
        "bestStreak": 15
      },
      {
        "rank": 2,
        "userId": "507f1f77bcf86cd799439012",
        "username": "cardmaster",
        "totalGames": 198,
        "totalWins": 121,
        "totalLosses": 77,
        "netProfit": 12350.0,
        "winRate": 61.11,
        "currentStreak": 3,
        "bestStreak": 12
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 50,
      "totalPlayers": 987,
      "limit": 20
    },
    "yourRank": 47,
    "yourStats": {
      "totalGames": 89,
      "totalWins": 52,
      "totalLosses": 37,
      "netProfit": 2340.5,
      "winRate": 58.43,
      "currentStreak": 2
    },
    "period": "WEEKLY",
    "gameMode": "REAL_MONEY",
    "lastUpdated": "2024-12-14T10:00:00.000Z"
  }
}
```

---

### 2. Get Friends Leaderboard

**GET** `/api/v1/leaderboard/friends`

**Description:** Get leaderboard of only your friends

**Authentication:** Required (JWT Token)

**Query Parameters:**

- `period`: Required, enum: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME"
- `gameMode`: Required, enum: "FREE_COIN" | "REAL_MONEY"

**Success Response (200):**

```json
{
  "message": "Friends leaderboard retrieved successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "totalGames": 145,
        "totalWins": 89,
        "netProfit": 3450.0,
        "winRate": 61.38,
        "currentStreak": 5,
        "globalRank": 47
      },
      {
        "rank": 2,
        "userId": "507f1f77bcf86cd799439012",
        "username": "janesmith",
        "totalGames": 98,
        "totalWins": 54,
        "netProfit": 2100.0,
        "winRate": 55.1,
        "currentStreak": 0,
        "globalRank": 156
      },
      {
        "rank": 3,
        "userId": "507f1f77bcf86cd799439010",
        "username": "you",
        "totalGames": 67,
        "totalWins": 38,
        "netProfit": 1250.5,
        "winRate": 56.72,
        "currentStreak": 2,
        "globalRank": 234
      }
    ],
    "totalFriends": 75,
    "rankedFriends": 43,
    "period": "WEEKLY",
    "gameMode": "REAL_MONEY"
  }
}
```

---

### 3. Get Player Statistics

**GET** `/api/v1/leaderboard/stats/:userId`

**Description:** Get detailed statistics for a specific player

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `userId`: User ID (default: current user if not specified)

**Success Response (200):**

```json
{
  "message": "Player statistics retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "username": "johndoe",
    "overallStats": {
      "totalGamesPlayed": 456,
      "totalWins": 267,
      "totalLosses": 189,
      "winRate": 58.55,
      "totalProfit": 8950.5,
      "averageProfitPerGame": 19.63
    },
    "periodStats": {
      "DAILY": {
        "totalGames": 12,
        "wins": 8,
        "losses": 4,
        "netProfit": 245.0,
        "rank": 23
      },
      "WEEKLY": {
        "totalGames": 67,
        "wins": 38,
        "losses": 29,
        "netProfit": 1250.5,
        "rank": 47
      },
      "MONTHLY": {
        "totalGames": 245,
        "wins": 142,
        "losses": 103,
        "netProfit": 4320.0,
        "rank": 34
      },
      "ALL_TIME": {
        "totalGames": 456,
        "wins": 267,
        "losses": 189,
        "netProfit": 8950.5,
        "rank": 156
      }
    },
    "streakStats": {
      "currentStreak": 5,
      "currentStreakType": "WIN",
      "bestWinStreak": 15,
      "bestLossStreak": 7
    },
    "gameModeStats": {
      "FREE_COIN": {
        "totalGames": 189,
        "wins": 102,
        "winRate": 53.97,
        "netProfit": 12500
      },
      "REAL_MONEY": {
        "totalGames": 267,
        "wins": 165,
        "winRate": 61.8,
        "netProfit": 8950.5
      }
    },
    "badges": [
      {
        "id": "STREAK_5",
        "name": "Hot Streak",
        "description": "Win 5 games in a row",
        "icon": "🔥",
        "earnedAt": "2024-12-14T09:00:00.000Z"
      },
      {
        "id": "VETERAN_100",
        "name": "Veteran Player",
        "description": "Play 100 games",
        "icon": "🎖️",
        "earnedAt": "2024-11-15T14:00:00.000Z"
      },
      {
        "id": "HIGH_ROLLER",
        "name": "High Roller",
        "description": "Profit over $5000",
        "icon": "💰",
        "earnedAt": "2024-12-01T10:00:00.000Z"
      }
    ],
    "recentGames": [
      {
        "gameId": "507f1f77bcf86cd799439020",
        "gameMode": "REAL_MONEY",
        "entryFee": 100,
        "rank": 1,
        "netChange": 275,
        "playedAt": "2024-12-14T10:00:00.000Z"
      },
      {
        "gameId": "507f1f77bcf86cd799439021",
        "gameMode": "REAL_MONEY",
        "entryFee": 50,
        "rank": 2,
        "netChange": 25,
        "playedAt": "2024-12-14T09:00:00.000Z"
      }
    ]
  }
}
```

---

### 4. Refresh Leaderboard

**POST** `/api/v1/leaderboard/refresh`

**Description:** Manually trigger leaderboard recalculation (Admin only)

**Authentication:** Required (Admin role)

**Request Body:**

```json
{
  "period": "WEEKLY",
  "gameMode": "REAL_MONEY"
}
```

**Success Response (200):**

```json
{
  "message": "Leaderboard refreshed successfully",
  "data": {
    "period": "WEEKLY",
    "gameMode": "REAL_MONEY",
    "playersRanked": 987,
    "refreshedAt": "2024-12-14T11:00:00.000Z"
  }
}
```

---

## Achievement Badges

### Available Badges (10 Total)

1. **Hot Streak (STREAK_5)** 🔥
   - Win 5 games in a row
2. **On Fire (STREAK_10)** 🔥🔥

   - Win 10 games in a row

3. **Unstoppable (STREAK_20)** 🔥🔥🔥

   - Win 20 games in a row

4. **Veteran Player (VETERAN_50)** 🎖️

   - Play 50 games

5. **Experienced (VETERAN_100)** 🎖️🎖️

   - Play 100 games

6. **Legend (VETERAN_500)** 🎖️🎖️🎖️

   - Play 500 games

7. **Lucky Player** 🍀

   - Win with less than 40% win rate over 20+ games

8. **Master Player** 👑

   - Maintain 65%+ win rate over 100+ games

9. **High Roller** 💰

   - Profit over $5,000 in real money games

10. **Profit King** 💎
    - Profit over $20,000 in real money games

---

## Background Job: Leaderboard Scheduler

### Schedule

- **Frequency:** Every hour (on the hour)
- **Execution Time:** ~2-5 minutes depending on player count

### What It Does

1. Calculates leaderboards for all combinations:

   - 4 periods: DAILY, WEEKLY, MONTHLY, ALL_TIME
   - 2 game modes: FREE_COIN, REAL_MONEY
   - **Total:** 8 leaderboards updated per run

2. Updates Redis sorted sets with rankings
3. Updates player stats in MongoDB
4. Calculates badges for all players

### Redis Sorted Sets

```
Key: leaderboard:WEEKLY:REAL_MONEY
Type: Sorted Set
Members: userId
Score: netProfit
```

---

## Ranking Calculation Logic

### Primary Sort: Net Profit (Descending)

- Higher profit = Higher rank

### Tiebreakers (in order):

1. **Win Rate** (higher is better)
2. **Total Games** (more games = higher rank)
3. **User ID** (alphabetically)

### Example:

```
Player A: $1000 profit, 60% win rate, 100 games
Player B: $1000 profit, 60% win rate, 80 games
Player C: $1000 profit, 55% win rate, 100 games

Rankings:
1. Player A (higher win rate, more games)
2. Player B (higher win rate)
3. Player C (lower win rate)
```

---

## Redis Cache Keys

### Leaderboard Cache

```
Key: leaderboard:${period}:${gameMode}
Type: Sorted Set
Members: JSON { userId, stats }
Score: netProfit
TTL: Based on period (DAILY: 24h, WEEKLY: 7d, etc.)
```

---

## Database Models

### PlayerStats

```typescript
{
  userId: ObjectId,
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME",
  gameMode: "FREE_COIN" | "REAL_MONEY",
  totalGames: number,
  totalWins: number,
  totalLosses: number,
  netProfit: number,
  winRate: number,
  currentStreak: number,
  bestStreak: number,
  lastGameResult: "WIN" | "LOSS",
  rank: number,
  periodStart: Date,
  periodEnd: Date,
  lastUpdated: Date
}
```

---

## Example Usage (cURL)

### Get Global Leaderboard:

```bash
curl -X GET "http://localhost:3000/api/v1/leaderboard/global?period=WEEKLY&gameMode=REAL_MONEY&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Friends Leaderboard:

```bash
curl -X GET "http://localhost:3000/api/v1/leaderboard/friends?period=WEEKLY&gameMode=REAL_MONEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Player Stats:

```bash
curl -X GET http://localhost:3000/api/v1/leaderboard/stats/507f1f77bcf86cd799439010 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Ranking Calculation:**

   - Player A: $1000 profit → Rank 50 ✓
   - Player B: $1500 profit → Rank 30 ✓
   - Rankings sorted by netProfit descending ✓

2. **Period Filtering:**

   - Get DAILY leaderboard → Only today's stats ✓
   - Get WEEKLY leaderboard → Last 7 days ✓
   - Get MONTHLY leaderboard → Last 30 days ✓
   - Get ALL_TIME leaderboard → All-time stats ✓

3. **Mode Separation:**

   - FREE_COIN leaderboard separate from REAL_MONEY ✓
   - Player can have different ranks in each mode ✓

4. **Cache Invalidation:**

   - Game completes → Stats updated ✓
   - Hourly job runs → Redis cache refreshed ✓
   - Manual refresh → Leaderboard recalculated immediately ✓

5. **Badge Calculation:**

   - Win 5 in a row → STREAK_5 badge earned ✓
   - Play 100 games → VETERAN_100 badge earned ✓
   - Profit $5000 → HIGH_ROLLER badge earned ✓
   - Badges persist across periods ✓

6. **Friends Leaderboard:**

   - Only shows friends ✓
   - Includes your rank among friends ✓
   - Shows global rank for each friend ✓

7. **Edge Cases:**
   - No games played → Rank null ✓
   - Tied netProfit → Tiebreaker by winRate ✓
   - Same winRate → Tiebreaker by totalGames ✓
