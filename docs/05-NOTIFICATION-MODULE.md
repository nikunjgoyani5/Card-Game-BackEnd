# Notification Module API Documentation

## Base URL

```
/api/v1/notifications
```

## Endpoints

### 1. Get Notifications

**GET** `/api/v1/notifications`

**Description:** Get user's notifications with pagination

**Authentication:** Required (JWT Token)

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 50)
- `read`: Filter by read status: true | false (optional)
- `type`: Filter by notification type (optional)

**Success Response (200):**

```json
{
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "notificationId": "notif_1703098745_abc123",
        "userId": "507f1f77bcf86cd799439010",
        "type": "FRIEND_REQUEST_RECEIVED",
        "title": "New Friend Request",
        "message": "johndoe sent you a friend request",
        "data": {
          "friendshipId": "friendship_abc123",
          "requesterId": "507f1f77bcf86cd799439011",
          "requesterUsername": "johndoe"
        },
        "channels": ["PUSH", "IN_APP"],
        "priority": "NORMAL",
        "read": false,
        "createdAt": "2024-12-14T10:30:00.000Z"
      },
      {
        "notificationId": "notif_1703098746_def456",
        "type": "DEPOSIT_COMPLETED",
        "title": "Deposit Successful",
        "message": "Your deposit of $100.00 has been credited to your wallet",
        "data": {
          "transactionId": "txn_abc123",
          "amount": 100.0
        },
        "priority": "HIGH",
        "read": true,
        "readAt": "2024-12-14T10:32:00.000Z",
        "createdAt": "2024-12-14T10:31:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalNotifications": 87,
      "limit": 20
    },
    "unreadCount": 12
  }
}
```

**Notification Types:**

- `FRIEND_REQUEST_RECEIVED` - Someone sent you a friend request
- `FRIEND_REQUEST_ACCEPTED` - Someone accepted your friend request
- `GAME_INVITATION` - You've been invited to a game
- `GAME_REMINDER_15MIN` - Scheduled game starts in 15 minutes
- `GAME_REMINDER_5MIN` - Scheduled game starts in 5 minutes
- `FRIENDS_ONLINE` - One or more friends came online
- `DEPOSIT_COMPLETED` - Deposit successfully completed
- `WITHDRAWAL_COMPLETED` - Withdrawal successfully completed
- `KYC_APPROVED` - KYC verification approved
- `KYC_REJECTED` - KYC verification rejected
- `NEW_FEATURE` - New feature announcement
- `SYSTEM_ANNOUNCEMENT` - Important system message

---

### 2. Mark Notification as Read

**PUT** `/api/v1/notifications/:notificationId/read`

**Description:** Mark a specific notification as read

**Authentication:** Required (JWT Token)

**URL Parameters:**

- `notificationId`: ID of notification to mark as read

**Success Response (200):**

```json
{
  "message": "Notification marked as read",
  "data": {
    "notificationId": "notif_1703098745_abc123",
    "read": true,
    "readAt": "2024-12-14T10:35:00.000Z"
  }
}
```

---

### 3. Mark All as Read

**PUT** `/api/v1/notifications/read-all`

**Description:** Mark all user's notifications as read

**Authentication:** Required (JWT Token)

**Success Response (200):**

```json
{
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 12
  }
}
```

---

### 4. Get Notification Preferences

**GET** `/api/v1/notifications/preferences`

**Description:** Get user's notification preferences

**Authentication:** Required (JWT Token)

**Success Response (200):**

```json
{
  "message": "Preferences retrieved successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "enabled": {
      "friendRequests": true,
      "gameInvitations": true,
      "scheduledGameReminders": true,
      "friendsOnline": false,
      "transactions": true,
      "newFeatures": true,
      "systemAnnouncements": true
    },
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00",
      "timezone": "America/New_York"
    },
    "pushEnabled": true,
    "inAppEnabled": true,
    "updatedAt": "2024-12-14T10:30:00.000Z"
  }
}
```

---

### 5. Update Notification Preferences

**PUT** `/api/v1/notifications/preferences`

**Description:** Update user's notification preferences

**Authentication:** Required (JWT Token)

**Request Body:** (All fields optional)

```json
{
  "enabled": {
    "friendRequests": true,
    "gameInvitations": true,
    "scheduledGameReminders": false,
    "friendsOnline": false,
    "transactions": true,
    "newFeatures": false,
    "systemAnnouncements": true
  },
  "quietHours": {
    "enabled": true,
    "startTime": "23:00",
    "endTime": "07:00",
    "timezone": "America/Los_Angeles"
  },
  "pushEnabled": true,
  "inAppEnabled": true
}
```

**Success Response (200):**

```json
{
  "message": "Preferences updated successfully",
  "data": {
    "userId": "507f1f77bcf86cd799439010",
    "enabled": {
      "friendRequests": true,
      "gameInvitations": true,
      "scheduledGameReminders": false,
      "friendsOnline": false,
      "transactions": true,
      "newFeatures": false,
      "systemAnnouncements": true
    },
    "quietHours": {
      "enabled": true,
      "startTime": "23:00",
      "endTime": "07:00",
      "timezone": "America/Los_Angeles"
    },
    "pushEnabled": true,
    "inAppEnabled": true,
    "updatedAt": "2024-12-14T11:00:00.000Z"
  }
}
```

---

## Socket.IO Events

### Events Received by Client

**Event:** `notification`
**Description:** New notification received
**Payload:**

```json
{
  "notificationId": "notif_1703098745_abc123",
  "type": "FRIEND_REQUEST_RECEIVED",
  "title": "New Friend Request",
  "message": "johndoe sent you a friend request",
  "data": {
    "friendshipId": "friendship_abc123",
    "requesterId": "507f1f77bcf86cd799439011"
  },
  "priority": "NORMAL",
  "createdAt": "2024-12-14T10:30:00.000Z"
}
```

**Event:** `notification_updated`
**Description:** Notification status updated (e.g., marked as read)
**Payload:**

```json
{
  "notificationId": "notif_1703098745_abc123",
  "read": true,
  "readAt": "2024-12-14T10:35:00.000Z"
}
```

---

## Notification System Features

### 1. Preference Enforcement

- Notifications only sent if user has enabled that notification type
- Respects push/in-app channel preferences
- Example: If `friendRequests` is disabled, no friend request notifications sent

### 2. Quiet Hours Check

- If quiet hours enabled, notifications are:
  - Still created in database
  - Marked for delivery after quiet hours
  - Push notifications deferred until quiet hours end
  - In-app notifications available immediately
- Timezone-aware (uses user's timezone setting)
- Example: Quiet hours 22:00-08:00 EST

### 3. Notification Grouping

- Multiple similar notifications grouped together
- Used for "Friends Online" notifications
- Groups notifications by type and time window (15 minutes)
- Example: "3 friends came online" instead of 3 separate notifications
- Grouped notifications have `groupId` and `groupCount` fields

### 4. Push Notification Delivery

- Integrates with FCM (Firebase Cloud Messaging) for Android
- Integrates with APNS (Apple Push Notification Service) for iOS
- Priority-based delivery:
  - `HIGH`: Immediate delivery, wakes device
  - `NORMAL`: Standard delivery
  - `LOW`: Opportunistic delivery
- Badge count updated on mobile devices

---

## Notification Priority Levels

| Priority | Use Case                                 | Delivery                |
| -------- | ---------------------------------------- | ----------------------- |
| `HIGH`   | Transactions, game starting, KYC updates | Immediate, wakes device |
| `NORMAL` | Friend requests, game invitations        | Standard delivery       |
| `LOW`    | New features, announcements              | Batched delivery        |

---

## Database Models

### Notification

```typescript
{
  notificationId: string,
  userId: ObjectId,
  type: string,
  title: string,
  message: string,
  data: object,
  channels: ["PUSH", "IN_APP"],
  priority: "HIGH" | "NORMAL" | "LOW",
  read: boolean,
  readAt: Date,
  groupId: string,
  groupCount: number,
  createdAt: Date,
  expiresAt: Date  // TTL: 30 days
}
```

### NotificationPreferences

```typescript
{
  userId: ObjectId,
  enabled: {
    friendRequests: boolean,
    gameInvitations: boolean,
    scheduledGameReminders: boolean,
    friendsOnline: boolean,
    transactions: boolean,
    newFeatures: boolean,
    systemAnnouncements: boolean
  },
  quietHours: {
    enabled: boolean,
    startTime: string,
    endTime: string,
    timezone: string
  },
  pushEnabled: boolean,
  inAppEnabled: boolean,
  updatedAt: Date
}
```

---

## Redis Cache

### Notification Preferences Cache

```
Key: notif:prefs:${userId}
Value: JSON (notification preferences)
TTL: 3600 seconds (1 hour)
```

---

## Example Usage (cURL)

### Get Notifications:

```bash
curl -X GET "http://localhost:3000/api/v1/notifications?page=1&limit=20&read=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Mark as Read:

```bash
curl -X PUT http://localhost:3000/api/v1/notifications/notif_1703098745_abc123/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Preferences:

```bash
curl -X PUT http://localhost:3000/api/v1/notifications/preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": {
      "friendRequests": true,
      "gameInvitations": false
    },
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00",
      "timezone": "America/New_York"
    }
  }'
```

---

## Testing Scenarios

### Manual QA Checklist

1. **Preference Enforcement:**

   - Disable friend requests in preferences ✓
   - Send friend request → No notification sent ✓
   - Enable friend requests → Notifications sent ✓

2. **Quiet Hours Check:**

   - Set quiet hours 22:00-08:00 ✓
   - Send notification at 23:00 → Push deferred ✓
   - In-app notification still created ✓
   - Push sent after 08:00 ✓

3. **Notification Grouping:**

   - 3 friends come online within 15 min ✓
   - Single notification created ✓
   - Message: "3 friends came online" ✓
   - groupCount = 3 ✓

4. **Push Notification Delivery:**

   - HIGH priority → Immediate, device wakes ✓
   - NORMAL priority → Standard delivery ✓
   - Badge count updated ✓

5. **Socket.IO Real-time:**

   - User online → Notification via socket ✓
   - User offline → Notification queued ✓
   - User comes online → Queued notifications delivered ✓

6. **Edge Cases:**
   - Notification expires after 30 days ✓
   - Preferences cached in Redis ✓
   - Grouped notifications deduplicated ✓
