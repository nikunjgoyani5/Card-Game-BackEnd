# Payment Integration Module API Documentation

## Base URL

```
/api/v1/payments
```

## Endpoints

### 1. Initiate Deposit

**POST** `/api/v1/payments/deposit`

**Description:** Create a payment session and redirect user to payment gateway

**Authentication:** Required (JWT Token)

**Request Body:**

```json
{
  "amount": 100.0,
  "paymentMethod": "CREDIT_CARD",
  "returnUrl": "https://yourapp.com/payment/success",
  "cancelUrl": "https://yourapp.com/payment/cancel"
}
```

**Validation Rules:**

- `amount`: Required, number, min: $1, max: $10,000
- `paymentMethod`: Required, enum: "CREDIT_CARD" | "PAYPAL" | "GOOGLE_PAY"
- `returnUrl`: Required, valid URL
- `cancelUrl`: Required, valid URL

**Success Response (200):**

```json
{
  "message": "Payment session created successfully",
  "data": {
    "transactionId": "txn_1703098745_abc123",
    "paymentUrl": "https://checkout.stripe.com/pay/cs_test_...",
    "sessionId": "cs_test_abc123",
    "amount": 100.0,
    "fee": 3.0,
    "totalAmount": 103.0,
    "paymentMethod": "CREDIT_CARD",
    "status": "PENDING",
    "expiresAt": "2024-12-14T11:30:00.000Z"
  }
}
```

**Fee Calculation:**

- Deposit Fee: 3% of amount
- Total Amount = Amount + Fee
- Net Amount = Amount (credited to wallet)

**Error Responses:**

- `400` - PAYMENT_001: Minimum deposit amount is $1
- `400` - PAYMENT_002: Maximum deposit amount is $10,000
- `400` - PAYMENT_003: Invalid payment method

---

### 2. Get Transaction Status

**GET** `/api/v1/payments/transaction/:transactionId`

**Description:** Get current status of a payment transaction

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `transactionId`: Transaction ID from initiate deposit

**Success Response (200):**

```json
{
  "message": "Transaction retrieved successfully",
  "data": {
    "transactionId": "txn_1703098745_abc123",
    "userId": "507f1f77bcf86cd799439010",
    "type": "DEPOSIT",
    "amount": 100.0,
    "fee": 3.0,
    "totalAmount": 103.0,
    "netAmount": 100.0,
    "paymentMethod": "CREDIT_CARD",
    "paymentProvider": "STRIPE",
    "status": "COMPLETED",
    "providerTransactionId": "pi_abc123",
    "completedAt": "2024-12-14T10:32:00.000Z",
    "createdAt": "2024-12-14T10:30:00.000Z"
  }
}
```

**Status Values:**

- `PENDING` - Payment session created, awaiting payment
- `PROCESSING` - Payment received, processing wallet credit
- `COMPLETED` - Payment successful, wallet credited
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded
- `CANCELLED` - Payment cancelled by user

---

### 3. Get Transaction History

**GET** `/api/v1/payments/history`

**Description:** Get user's payment transaction history

**Authentication:** Required (JWT Token)

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (optional)
- `type`: Filter by type: "DEPOSIT" | "REFUND" (optional)

**Success Response (200):**

```json
{
  "message": "Transaction history retrieved successfully",
  "data": {
    "transactions": [
      {
        "transactionId": "txn_1703098745_abc123",
        "type": "DEPOSIT",
        "amount": 100.0,
        "fee": 3.0,
        "totalAmount": 103.0,
        "paymentMethod": "CREDIT_CARD",
        "status": "COMPLETED",
        "completedAt": "2024-12-14T10:32:00.000Z",
        "createdAt": "2024-12-14T10:30:00.000Z"
      },
      {
        "transactionId": "txn_1703012345_def456",
        "type": "DEPOSIT",
        "amount": 50.0,
        "fee": 1.5,
        "totalAmount": 51.5,
        "paymentMethod": "PAYPAL",
        "status": "COMPLETED",
        "completedAt": "2024-12-13T15:20:00.000Z",
        "createdAt": "2024-12-13T15:18:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalTransactions": 47,
      "limit": 20
    },
    "summary": {
      "totalDeposited": 1250.0,
      "totalFees": 37.5,
      "successfulTransactions": 25,
      "pendingTransactions": 0
    }
  }
}
```

---

### 4. Stripe Webhook Handler

**POST** `/api/v1/payments/webhook/stripe`

**Description:** Handle Stripe payment completion webhooks (Internal endpoint)

**Authentication:** None (Verified via Stripe signature)

**Headers:**

```
stripe-signature: t=1234567890,v1=abc123...
```

**Request Body:** (Stripe Event Object)

```json
{
  "id": "evt_abc123",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "payment_status": "paid",
      "metadata": {
        "transactionId": "txn_1703098745_abc123",
        "userId": "507f1f77bcf86cd799439010"
      }
    }
  }
}
```

**Success Response (200):**

```json
{
  "received": true
}
```

**Processing:**

1. Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
2. Find transaction by transactionId in metadata
3. Update transaction status to COMPLETED
4. Credit user wallet (MongoDB transaction)
5. Send notification to user
6. Return success response

**Error Responses:**

- `400` - PAYMENT_005: Invalid webhook signature
- `400` - PAYMENT_006: Transaction already processed

---

### 5. Cancel Payment

**POST** `/api/v1/payments/cancel/:transactionId`

**Description:** Cancel a pending payment transaction

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `transactionId`: Transaction ID to cancel

**Success Response (200):**

```json
{
  "message": "Payment cancelled successfully",
  "data": {
    "transactionId": "txn_1703098745_abc123",
    "status": "CANCELLED",
    "cancelledAt": "2024-12-14T10:35:00.000Z"
  }
}
```

**Error Responses:**

- `400` - Cannot cancel completed transaction
- `404` - Transaction not found

---

## Payment Flow

### Complete Payment Flow:

1. **User Initiates Deposit:**

   ```
   POST /api/v1/payments/deposit
   → Creates PaymentTransaction with status PENDING
   → Creates Stripe checkout session
   → Returns payment URL
   ```

2. **User Redirected to Payment Gateway:**

   ```
   User completes payment on Stripe
   → Stripe processes payment
   → User redirected to returnUrl
   ```

3. **Webhook Received:**

   ```
   Stripe → POST /api/v1/payments/webhook/stripe
   → Verify signature
   → Update transaction status to PROCESSING
   ```

4. **Wallet Credited:**

   ```
   → Start MongoDB transaction
   → Update user wallet balance
   → Create Transaction record
   → Update PaymentTransaction status to COMPLETED
   → Commit transaction
   ```

5. **Notification Sent:**

   ```
   → Send in-app notification
   → Send push notification
   → Emit Socket.IO event
   ```

6. **User Sees Updated Balance:**
   ```
   GET /api/v1/auth/profile
   → Returns updated wallet balance
   ```

---

## Error Codes

| Code          | Message                           |
| ------------- | --------------------------------- |
| `PAYMENT_001` | Minimum deposit amount is $1      |
| `PAYMENT_002` | Maximum deposit amount is $10,000 |
| `PAYMENT_003` | Invalid payment method            |
| `PAYMENT_004` | Payment processing failed         |
| `PAYMENT_005` | Invalid webhook signature         |
| `PAYMENT_006` | Transaction already processed     |
| `PAYMENT_007` | Transaction not found or invalid  |

---

## Constants

```typescript
MIN_DEPOSIT_AMOUNT = 1;
MAX_DEPOSIT_AMOUNT = 10000;
DEPOSIT_FEE_PERCENTAGE = 0.03; // 3%
```

---

## Security Features

### ✅ PCI-DSS Compliance

- No card data stored in database
- All card handling via Stripe tokenization
- Only store Stripe session/transaction IDs

### ✅ Webhook Verification

```typescript
// Verify webhook signature
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
```

### ✅ Transaction Atomicity

```typescript
// MongoDB transaction ensures wallet credit is atomic
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Update wallet
  // Create transaction log
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

### ✅ HTTPS Only

All payment endpoints must use HTTPS in production

---

## Database Models

### PaymentTransaction

```typescript
{
  transactionId: string,
  userId: ObjectId,
  type: "DEPOSIT" | "REFUND",
  amount: number,
  fee: number,
  totalAmount: number,
  netAmount: number,
  paymentMethod: "CREDIT_CARD" | "PAYPAL" | "GOOGLE_PAY",
  paymentProvider: "STRIPE" | "PAYPAL" | "GOOGLE_PAY",
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED",
  providerSessionId: string,
  providerTransactionId: string,
  webhookReceived: boolean,
  completedAt: Date,
  expiresAt: Date,
  ipAddress: string,
  metadata: object
}
```

---

## Example Usage (cURL)

### Initiate Deposit:

```bash
curl -X POST http://localhost:3000/api/v1/payments/deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "paymentMethod": "CREDIT_CARD",
    "returnUrl": "https://yourapp.com/payment/success",
    "cancelUrl": "https://yourapp.com/payment/cancel"
  }'
```

### Get Transaction Status:

```bash
curl -X GET http://localhost:3000/api/v1/payments/transaction/txn_1703098745_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Transaction History:

```bash
curl -X GET "http://localhost:3000/api/v1/payments/history?page=1&limit=20&status=COMPLETED" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Deposit Amount Validation:**

   - Amount < $1 → Returns PAYMENT_001 ✓
   - Amount > $10,000 → Returns PAYMENT_002 ✓
   - Valid amount → Creates session ✓

2. **Fee Calculation:**

   - $100 deposit → $3 fee, $103 total ✓
   - Fee = amount \* 0.03 ✓
   - Net amount = original amount ✓

3. **Webhook Signature Verification:**

   - Valid signature → Processes webhook ✓
   - Invalid signature → Returns PAYMENT_005 ✓
   - Missing signature → Rejects request ✓

4. **Wallet Credit Atomicity:**

   - Successful payment → Wallet credited ✓
   - Webhook fails → Transaction rolled back ✓
   - Duplicate webhook → Ignored (PAYMENT_006) ✓

5. **Complete Payment Flow:**

   - User initiates deposit ✓
   - Redirected to Stripe ✓
   - Completes payment ✓
   - Webhook received and verified ✓
   - Wallet credited atomically ✓
   - Notification sent ✓
   - User sees updated balance ✓

6. **Edge Cases:**
   - Expired payment session → Cannot complete ✓
   - Cancelled payment → Status updated ✓
   - Failed payment → No wallet credit ✓
   - Refunded payment → Wallet adjusted ✓
