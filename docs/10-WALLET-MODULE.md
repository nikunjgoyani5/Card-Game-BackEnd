# Wallet Module API Documentation

## Base URL

```
/api/v1/wallet
```

---

## REST Endpoints

### 1. Get Wallet Balance

**GET** `/api/v1/wallet`

**Description:** Get current wallet balance for authenticated user

**Authentication:** Required (JWT Token)

**Success Response (200):**

```json
{
  "message": "Wallet balance retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "wallet": {
      "realMoney": {
        "total": 5000.0,
        "locked": 200.0,
        "available": 4800.0
      },
      "coin": {
        "total": 1500,
        "locked": 100,
        "available": 1400
      }
    },
    "lastUpdated": "2024-12-14T10:30:00.000Z"
  }
}
```

**Wallet Structure Explanation:**

- **realMoney**: Actual currency (can be withdrawn)
  - `total`: Total real money balance
  - `locked`: Amount locked in active games
  - `available`: Amount available for use
- **coin**: In-game virtual currency (cannot be withdrawn)
  - `total`: Total coins
  - `locked`: Coins locked in active games
  - `available`: Coins available for use

---

### 2. Lock Entry Fee

**POST** `/api/v1/wallet/lock-entry-fee`

**Description:** Lock funds when joining a game room (system internal use)

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "roomId": "507f1f77bcf86cd799439020",
  "amount": 100,
  "walletType": "realMoney"
}
```

**Validation Rules:**

- `roomId`: Required, valid MongoDB ObjectId
- `amount`: Required, number, min: 1
- `walletType`: Required, enum: "realMoney", "coin"

**Success Response (200):**

```json
{
  "message": "Entry fee locked successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "roomId": "507f1f77bcf86cd799439020",
    "amount": 100,
    "walletType": "realMoney",
    "lockedAt": "2024-12-14T10:30:00.000Z",
    "newBalance": {
      "total": 5000.0,
      "locked": 300.0,
      "available": 4700.0
    }
  }
}
```

**Side Effects:**

- Amount moved from `available` to `locked`
- Transaction record created (type: LOCK_ENTRY_FEE)

---

### 3. Unlock Entry Fee

**POST** `/api/v1/wallet/unlock-entry-fee`

**Description:** Unlock funds when leaving room before game starts (system internal use)

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "roomId": "507f1f77bcf86cd799439020",
  "amount": 100,
  "walletType": "realMoney"
}
```

**Success Response (200):**

```json
{
  "message": "Entry fee unlocked successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "roomId": "507f1f77bcf86cd799439020",
    "amount": 100,
    "walletType": "realMoney",
    "unlockedAt": "2024-12-14T10:35:00.000Z",
    "newBalance": {
      "total": 5000.0,
      "locked": 200.0,
      "available": 4800.0
    }
  }
}
```

**Side Effects:**

- Amount moved from `locked` to `available`
- Transaction record created (type: UNLOCK_ENTRY_FEE)

---

### 4. Buy Coins (In-App Purchase)

**POST** `/api/v1/wallet/buy-coins`

**Description:** Purchase coins using real money (in-game currency)

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "amount": 1000,
  "paymentMethod": "STRIPE"
}
```

**Validation Rules:**

- `amount`: Required, number, min: 100, max: 100000
- `paymentMethod`: Required, enum: "STRIPE", "PAYPAL", "RAZORPAY"

**Success Response (200):**

```json
{
  "message": "Coins purchased successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "coinsAdded": 1000,
    "realMoneyDeducted": 10.0,
    "conversionRate": 100,
    "transactionId": "507f1f77bcf86cd799439200",
    "newBalance": {
      "realMoney": {
        "total": 4990.0,
        "available": 4790.0
      },
      "coin": {
        "total": 2500,
        "available": 2400
      }
    }
  }
}
```

**Coin Packages:**
| Coins | Real Money | Bonus |
|-------|------------|-------|
| 100 | $1.00 | - |
| 500 | $4.50 | +10% |
| 1000 | $8.00 | +20% |
| 5000 | $35.00 | +30% |
| 10000 | $60.00 | +50% |

---

### 5. Grant Ad Reward

**POST** `/api/v1/wallet/ad-reward`

**Description:** Grant coins for watching an advertisement

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "adId": "ad_123456",
  "adProvider": "GOOGLE_ADMOB",
  "rewardAmount": 50
}
```

**Validation Rules:**

- `adId`: Required, string
- `adProvider`: Required, enum: "GOOGLE_ADMOB", "FACEBOOK_AUDIENCE"
- `rewardAmount`: Required, number, min: 1, max: 100

**Success Response (200):**

```json
{
  "message": "Ad reward granted successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "coinsAdded": 50,
    "adId": "ad_123456",
    "adProvider": "GOOGLE_ADMOB",
    "grantedAt": "2024-12-14T10:40:00.000Z",
    "newBalance": {
      "coin": {
        "total": 2550,
        "available": 2450
      }
    },
    "dailyAdWatched": 5,
    "dailyAdLimit": 10
  }
}
```

**Rate Limits:**

- Maximum 10 ads per day
- Maximum 500 coins per day from ads
- 5-minute cooldown between ads

---

### 6. Add Money (Legacy Deposit)

**POST** `/api/v1/wallet/deposit`

**Description:** Add real money to wallet (legacy endpoint, use payment module instead)

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "amount": 100,
  "paymentMethod": "STRIPE"
}
```

**Success Response (200):**

```json
{
  "message": "Money added successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "amount": 100,
    "paymentMethod": "STRIPE",
    "transactionId": "507f1f77bcf86cd799439201",
    "newBalance": {
      "realMoney": {
        "total": 5100.0,
        "available": 4900.0
      }
    }
  }
}
```

**Note:** This is a legacy endpoint. For new integrations, use `/api/v1/payments/deposit` instead.

---

### 7. Withdraw Money (Legacy)

**POST** `/api/v1/wallet/withdraw`

**Description:** Withdraw real money from wallet (legacy endpoint, use withdrawal module instead)

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "amount": 500,
  "method": "BANK_TRANSFER"
}
```

**Success Response (200):**

```json
{
  "message": "Withdrawal initiated successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "amount": 500,
    "method": "BANK_TRANSFER",
    "withdrawalId": "507f1f77bcf86cd799439300",
    "status": "PENDING",
    "newBalance": {
      "realMoney": {
        "total": 4600.0,
        "available": 4400.0
      }
    }
  }
}
```

**Note:** This is a legacy endpoint. For new integrations, use `/api/v1/withdrawals/request` instead.

---

## Transaction Types

| Type               | Description                    |
| ------------------ | ------------------------------ |
| `DEPOSIT`          | Add real money to wallet       |
| `WITHDRAWAL`       | Remove real money from wallet  |
| `GAME_WIN`         | Winnings from game             |
| `GAME_LOSS`        | Loss from game                 |
| `LOCK_ENTRY_FEE`   | Lock funds when joining room   |
| `UNLOCK_ENTRY_FEE` | Unlock funds when leaving room |
| `REFUND`           | Admin issued refund            |
| `BUY_COINS`        | Purchase coins with real money |
| `AD_REWARD`        | Coins from watching ads        |
| `BONUS`            | Promotional bonus              |

---

## Wallet Types

### realMoney

- Actual currency (USD, INR, etc.)
- Can be withdrawn
- Used for high-stakes games
- Requires KYC for large transactions

### coin

- In-game virtual currency
- Cannot be withdrawn
- Used for casual games
- Earned through gameplay, ads, bonuses
- Can be purchased with real money

---

## Error Codes

| Code         | Message                           |
| ------------ | --------------------------------- |
| `WALLET_001` | Insufficient balance              |
| `WALLET_002` | Invalid amount                    |
| `WALLET_003` | Wallet not found                  |
| `WALLET_004` | Amount exceeds daily limit        |
| `WALLET_005` | Transaction failed                |
| `WALLET_006` | Cannot withdraw locked funds      |
| `WALLET_007` | Minimum withdrawal amount not met |
| `WALLET_008` | Ad reward limit reached           |
| `WALLET_009` | Ad cooldown active                |

---

## Example Usage (cURL)

### Get Wallet Balance:

```bash
curl -X GET http://localhost:3000/api/v1/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Lock Entry Fee:

```bash
curl -X POST http://localhost:3000/api/v1/wallet/lock-entry-fee \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "507f1f77bcf86cd799439020",
    "amount": 100,
    "walletType": "realMoney"
  }'
```

### Buy Coins:

```bash
curl -X POST http://localhost:3000/api/v1/wallet/buy-coins \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "paymentMethod": "STRIPE"
  }'
```

### Grant Ad Reward:

```bash
curl -X POST http://localhost:3000/api/v1/wallet/ad-reward \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adId": "ad_123456",
    "adProvider": "GOOGLE_ADMOB",
    "rewardAmount": 50
  }'
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Get Wallet Balance:**

   - New user → Both wallets initialized to 0 ✓
   - Active user → Correct balances shown ✓
   - locked + available = total ✓

2. **Lock/Unlock Entry Fee:**

   - Lock 100 → available -100, locked +100 ✓
   - Insufficient balance → WALLET_001 error ✓
   - Unlock 100 → available +100, locked -100 ✓
   - Transaction records created ✓

3. **Buy Coins:**

   - Buy 1000 coins → Real money -$10, coins +1000 ✓
   - Insufficient real money → WALLET_001 error ✓
   - Bonus applied for bulk purchases ✓
   - Transaction records created ✓

4. **Ad Reward:**

   - Watch ad → Coins +50 ✓
   - 11th ad in day → WALLET_008 error ✓
   - Ad within 5min cooldown → WALLET_009 error ✓
   - Daily counter resets at midnight ✓

5. **Real Money Flow:**

   - Deposit $100 → realMoney.total +$100 ✓
   - Win game → realMoney.total +winnings ✓
   - Withdraw $50 → realMoney.total -$50 ✓

6. **Coin Flow:**

   - Buy 1000 coins → coin.total +1000 ✓
   - Watch ad → coin.total +50 ✓
   - Bonus received → coin.total +bonus ✓
   - Use coins in game → coin.locked increases ✓

7. **Transaction Atomicity:**

   - Game join → Lock succeeds or fails atomically ✓
   - Game end → Settlements succeed or rollback ✓
   - Concurrent transactions → No race conditions ✓

8. **Edge Cases:**
   - Negative amount → Validation error ✓
   - Amount = 0 → Validation error ✓
   - Locked > available → Cannot lock ✓
   - Withdraw locked funds → WALLET_006 error ✓
