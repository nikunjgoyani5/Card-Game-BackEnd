# Withdrawal & KYC Module API Documentation

## Base URL

```
/api/v1/withdrawals
/api/v1/kyc
```

## KYC Endpoints

### 1. Initiate KYC Verification

**POST** `/api/v1/kyc/initiate`

**Description:** Start KYC verification process and get document upload URLs

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "idType": "PASSPORT",
  "country": "US"
}
```

**Success Response (200):**

```json
{
  "message": "KYC verification initiated. Please upload your documents.",
  "data": {
    "verificationId": "507f1f77bcf86cd799439011",
    "uploadUrls": {
      "idDocument": "https://s3.amazonaws.com/presigned-url-1",
      "proofOfAddress": "https://s3.amazonaws.com/presigned-url-2",
      "selfie": "https://s3.amazonaws.com/presigned-url-3"
    },
    "expiresIn": 3600
  }
}
```

**Error Responses:**

- `400` - KYC_005: KYC already verified
- `400` - KYC_006: KYC verification is pending

---

### 2. Submit KYC Documents

**POST** `/api/v1/kyc/submit`

**Description:** Submit KYC verification after uploading documents

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "verificationId": "507f1f77bcf86cd799439011",
  "documents": [
    {
      "type": "ID_CARD",
      "fileUrl": "https://s3.amazonaws.com/bucket/user-id-card.jpg"
    },
    {
      "type": "PROOF_OF_ADDRESS",
      "fileUrl": "https://s3.amazonaws.com/bucket/user-address-proof.pdf"
    }
  ],
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipcode": "10001",
      "country": "US"
    }
  }
}
```

**Success Response (200):**

```json
{
  "message": "KYC documents submitted successfully. Verification in progress.",
  "data": {
    "verificationId": "507f1f77bcf86cd799439011",
    "status": "IN_REVIEW",
    "submittedAt": "2024-12-14T10:30:00.000Z",
    "estimatedReviewTime": "24-48 hours"
  }
}
```

---

### 3. Get KYC Status

**GET** `/api/v1/kyc/status`

**Description:** Get current KYC verification status

**Authentication:** Required (JWT Token)

**Success Response (200):**

```json
{
  "message": "KYC status retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "level": "STANDARD",
    "status": "APPROVED",
    "submittedAt": "2024-12-14T10:30:00.000Z",
    "approvedAt": "2024-12-15T14:20:00.000Z",
    "expiresAt": "2026-12-15T14:20:00.000Z",
    "withdrawalLimits": {
      "daily": 5000,
      "monthly": 50000,
      "lifetime": 500000
    },
    "verifiedInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15"
    }
  }
}
```

**KYC Levels:**

- `NONE` - No verification (can play, cannot withdraw)
- `BASIC` - Email + Phone verified (withdrawals up to $100)
- `STANDARD` - ID document verified (withdrawals up to $1,000)
- `ENHANCED` - Full verification (unlimited withdrawals)

**KYC Status:**

- `NOT_STARTED` - No KYC initiated
- `PENDING` - Documents being uploaded
- `IN_REVIEW` - Under review by admin
- `APPROVED` - Verification successful
- `REJECTED` - Verification rejected
- `EXPIRED` - Verification expired (re-verification required)

---

## Withdrawal Endpoints

### 1. Request Withdrawal

**POST** `/api/v1/withdrawals/request`

**Description:** Create a withdrawal request

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "amount": 500.0,
  "method": "BANK_ACCOUNT",
  "destination": {
    "bankAccount": {
      "accountNumber": "1234567890",
      "routingNumber": "021000021",
      "accountHolderName": "John Doe",
      "bankName": "Chase Bank"
    }
  }
}
```

**Alternative Methods:**

**PayPal:**

```json
{
  "amount": 500.0,
  "method": "PAYPAL",
  "destination": {
    "paypal": {
      "email": "john@example.com"
    }
  }
}
```

**Google Wallet:**

```json
{
  "amount": 500.0,
  "method": "GOOGLE_WALLET",
  "destination": {
    "googleWallet": {
      "email": "john@gmail.com"
    }
  }
}
```

**Validation Rules:**

- `amount`: Required, number, min: $50
- `method`: Required, enum: "BANK_ACCOUNT" | "PAYPAL" | "GOOGLE_WALLET"
- `destination`: Required, object matching method type

**Success Response (201):**

```json
{
  "message": "Withdrawal request created successfully",
  "data": {
    "withdrawalId": "wd_1703098745_abc123",
    "userId": "507f1f77bcf86cd799439010",
    "amount": 500.0,
    "fee": 2.0,
    "netAmount": 498.0,
    "method": "BANK_ACCOUNT",
    "status": "PENDING",
    "requestedAt": "2024-12-14T10:30:00.000Z",
    "estimatedArrival": "2-3 business days"
  }
}
```

**Error Responses:**

- `400` - WITHDRAWAL_001: Minimum withdrawal amount is $50
- `400` - WITHDRAWAL_003: Daily withdrawal limit reached
- `400` - KYC_001: KYC verification required before withdrawal
- `400` - Insufficient balance

---

### 2. Get Withdrawal Status

**GET** `/api/v1/withdrawals/:withdrawalId`

**Description:** Get status of a specific withdrawal request

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `withdrawalId`: Withdrawal ID from request

**Success Response (200):**

```json
{
  "message": "Withdrawal retrieved successfully",
  "data": {
    "withdrawalId": "wd_1703098745_abc123",
    "userId": "507f1f77bcf86cd799439010",
    "amount": 500.0,
    "fee": 2.0,
    "netAmount": 498.0,
    "method": "BANK_ACCOUNT",
    "status": "COMPLETED",
    "requestedAt": "2024-12-14T10:30:00.000Z",
    "processingStartedAt": "2024-12-14T10:35:00.000Z",
    "completedAt": "2024-12-15T09:00:00.000Z",
    "providerTransactionId": "po_abc123"
  }
}
```

**Status Values:**

- `PENDING` - Withdrawal request created, awaiting processing
- `PROCESSING` - Withdrawal being processed by payment provider
- `COMPLETED` - Withdrawal successful, funds transferred
- `FAILED` - Withdrawal failed, funds refunded
- `REFUNDED` - Withdrawal refunded manually
- `CANCELLED` - Withdrawal cancelled by user

---

### 3. Get Withdrawal History

**GET** `/api/v1/withdrawals/history`

**Description:** Get user's withdrawal history

**Authentication:** Required (JWT Token)

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (optional)

**Success Response (200):**

```json
{
  "message": "Withdrawal history retrieved successfully",
  "data": {
    "withdrawals": [
      {
        "withdrawalId": "wd_1703098745_abc123",
        "amount": 500.0,
        "fee": 2.0,
        "netAmount": 498.0,
        "method": "BANK_ACCOUNT",
        "status": "COMPLETED",
        "requestedAt": "2024-12-14T10:30:00.000Z",
        "completedAt": "2024-12-15T09:00:00.000Z"
      },
      {
        "withdrawalId": "wd_1703012345_def456",
        "amount": 250.0,
        "fee": 2.0,
        "netAmount": 248.0,
        "method": "PAYPAL",
        "status": "COMPLETED",
        "requestedAt": "2024-12-10T15:20:00.000Z",
        "completedAt": "2024-12-10T16:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalWithdrawals": 15,
      "limit": 20
    },
    "summary": {
      "totalWithdrawn": 2750.0,
      "totalFees": 30.0,
      "successfulWithdrawals": 12,
      "pendingWithdrawals": 1
    }
  }
}
```

---

### 4. Cancel Withdrawal

**POST** `/api/v1/withdrawals/cancel/:withdrawalId`

**Description:** Cancel a pending withdrawal request

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `withdrawalId`: Withdrawal ID to cancel

**Success Response (200):**

```json
{
  "message": "Withdrawal cancelled successfully",
  "data": {
    "withdrawalId": "wd_1703098745_abc123",
    "status": "CANCELLED",
    "refundedAmount": 500.0
  }
}
```

**Error Responses:**

- `400` - Cannot cancel completed withdrawal
- `400` - Cannot cancel processing withdrawal
- `404` - Withdrawal not found

---

## Complete Withdrawal Flow

### Step-by-Step Process:

1. **User Checks KYC Status:**

   ```
   GET /api/v1/kyc/status
   → If not verified, initiate KYC
   ```

2. **KYC Verification (if required):**

   ```
   POST /api/v1/kyc/initiate
   → Get upload URLs
   → Upload documents to S3
   POST /api/v1/kyc/submit
   → Admin reviews (24-48 hours)
   → Status becomes APPROVED
   ```

3. **Request Withdrawal:**

   ```
   POST /api/v1/withdrawals/request
   → System checks:
     - KYC verification ✓
     - Sufficient balance ✓
     - Daily limit not exceeded ✓
   → Deduct amount from wallet (locked)
   → Create WithdrawalRequest with status PENDING
   ```

4. **Processing:**

   ```
   → Background job picks up PENDING withdrawal
   → Status changes to PROCESSING
   → Send to payment processor (Stripe/PayPal)
   → Await confirmation
   ```

5. **Completion:**

   ```
   → Payment processor confirms transfer
   → Status changes to COMPLETED
   → Locked funds removed from wallet
   → Notification sent to user
   ```

6. **Failed Withdrawal Refund:**
   ```
   → If payment fails:
     - Status changes to FAILED
     - Locked funds returned to available balance
     - Notification sent with failure reason
   ```

---

## Error Codes

### KYC Errors

| Code      | Message                                     |
| --------- | ------------------------------------------- |
| `KYC_001` | KYC verification required before withdrawal |
| `KYC_002` | KYC verification expired. Please re-verify. |
| `KYC_003` | KYC verification rejected. Contact support. |
| `KYC_004` | Invalid or missing document                 |
| `KYC_005` | KYC already verified                        |
| `KYC_006` | KYC verification is pending                 |

### Withdrawal Errors

| Code             | Message                          |
| ---------------- | -------------------------------- |
| `WITHDRAWAL_001` | Minimum withdrawal amount is $50 |
| `WITHDRAWAL_002` | Invalid withdrawal method        |
| `WITHDRAWAL_003` | Daily withdrawal limit reached   |
| `WITHDRAWAL_004` | Withdrawal processing failed     |
| `WITHDRAWAL_005` | Invalid withdrawal destination   |

---

## Constants

```typescript
MIN_WITHDRAWAL_AMOUNT = 50;
WITHDRAWAL_FEE = 2.0;
DAILY_WITHDRAWAL_LIMIT = 10000;

KYC_EXPIRY_YEARS = 2;
```

---

## Database Models

### KYCVerification

```typescript
{
  userId: ObjectId,
  level: "NONE" | "BASIC" | "STANDARD" | "ENHANCED",
  status: "NOT_STARTED" | "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED",
  documents: Array<{
    type: string,
    fileUrl: string,
    uploadedAt: Date,
    verifiedAt: Date
  }>,
  verifiedFirstName: string,
  verifiedLastName: string,
  verifiedDateOfBirth: Date,
  verifiedAddress: object,
  dailyWithdrawalLimit: number,
  monthlyWithdrawalLimit: number,
  submittedAt: Date,
  approvedAt: Date,
  expiresAt: Date
}
```

### WithdrawalRequest

```typescript
{
  withdrawalId: string,
  userId: ObjectId,
  amount: number,
  fee: number,
  netAmount: number,
  method: "BANK_ACCOUNT" | "PAYPAL" | "GOOGLE_WALLET",
  destination: object,
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED",
  kycVerified: boolean,
  requestedAt: Date,
  completedAt: Date,
  failureReason: string
}
```

---

## Example Usage (cURL)

### Initiate KYC:

```bash
curl -X POST http://localhost:3000/api/v1/kyc/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "idType": "PASSPORT",
    "country": "US"
  }'
```

### Request Withdrawal:

```bash
curl -X POST http://localhost:3000/api/v1/withdrawals/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "method": "BANK_ACCOUNT",
    "destination": {
      "bankAccount": {
        "accountNumber": "1234567890",
        "routingNumber": "021000021",
        "accountHolderName": "John Doe"
      }
    }
  }'
```

---

## Testing Scenarios

### Manual QA Checklist

1. **KYC Check Before Withdrawal:**

   - No KYC → Returns KYC_001 ✓
   - Pending KYC → Returns KYC_001 ✓
   - Expired KYC → Returns KYC_002 ✓
   - Rejected KYC → Returns KYC_003 ✓
   - Approved KYC → Proceeds with withdrawal ✓

2. **Minimum Amount Validation:**

   - Amount < $50 → Returns WITHDRAWAL_001 ✓
   - Amount >= $50 → Proceeds ✓

3. **Withdrawal Fee Application:**

   - $500 withdrawal → $2 fee, $498 net amount ✓
   - Fee is fixed at $2.00 ✓

4. **Failed Withdrawal Refund:**

   - Withdrawal fails → Status = FAILED ✓
   - Locked funds returned to wallet ✓
   - Notification sent to user ✓

5. **Complete Flow:**
   - User has approved KYC ✓
   - Request $500 withdrawal ✓
   - $500 locked in wallet ✓
   - Processing starts ✓
   - Payment sent to bank ✓
   - Status = COMPLETED ✓
   - Locked funds removed ✓
   - Notification sent ✓
