# Authentication Module API Documentation

## Base URL

```
/api/v1/auth
```

## Endpoints

### 1. Register User

**POST** `/api/v1/auth/register`

**Description:** Create a new user account

**Authentication:** None required

**Request Body:**

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass123",
  "confirmPassword": "securepass123",
  "phone": "+1234567890",
  "location": "New York",
  "state": "NY",
  "street": "123 Main St",
  "city": "New York",
  "zipcode": "10001"
}
```

**Validation Rules:**

- `username`: Required, string
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters
- `confirmPassword`: Required, must match password
- `phone`: Required, string
- All location fields: Required, string

**Success Response (201):**

```json
{
  "message": "User registered successfully.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "wallet": {
      "realMoneyBalance": 0,
      "coinBalance": 10000
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `400` - Validation error or password mismatch
- `409` - Email already registered / Username already taken

---

### 2. Login User

**POST** `/api/v1/auth/login`

**Description:** Authenticate user and receive JWT token

**Authentication:** None required

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "USER",
    "accountStatus": "ACTIVE",
    "wallet": {
      "realMoneyBalance": 150.5,
      "coinBalance": 5000
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `400` - Validation error
- `401` - Invalid credentials
- `403` - Account suspended or banned

---

### 3. Google Login

**POST** `/api/v1/auth/google`

**Description:** Authenticate via Google OAuth

**Authentication:** None required

**Request Body:**

```json
{
  "googleId": "1234567890",
  "name": "John Doe",
  "email": "john@gmail.com"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "john_doe_1234",
    "email": "john@gmail.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 4. Get Profile

**GET** `/api/v1/auth/profile`

**Description:** Get current user's profile information

**Authentication:** Required (JWT Token)

**Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "message": "Profile retrieved successfully.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe",
    "location": "New York",
    "state": "NY",
    "city": "New York",
    "zipcode": "10001",
    "accountStatus": "ACTIVE",
    "role": "USER",
    "wallet": {
      "realMoneyBalance": 150.5,
      "realMoneyLocked": 25.0,
      "coinBalance": 5000,
      "coinLocked": 100
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSelectedMode": "REAL_MONEY"
  }
}
```

**Error Responses:**

- `401` - Unauthorized (missing or invalid token)

---

### 5. Update Profile

**PUT** `/api/v1/auth/profile`

**Description:** Update user profile information

**Authentication:** Required (JWT Token)

**Request Body:** (All fields optional)

```json
{
  "email": "newemail@example.com",
  "phone": "+1987654321",
  "location": "Los Angeles",
  "state": "CA",
  "street": "456 Oak Ave",
  "city": "Los Angeles",
  "zipcode": "90001"
}
```

**Success Response (200):**

```json
{
  "message": "Profile updated successfully.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "newemail@example.com",
    "phone": "+1987654321",
    "location": "Los Angeles",
    "state": "CA"
  }
}
```

---

### 6. Logout

**POST** `/api/v1/auth/logout`

**Description:** Logout user (invalidates token by incrementing tokenVersion)

**Authentication:** Required (JWT Token)

**Request Body:** None

**Success Response (200):**

```json
{
  "message": "Logout successful.",
  "data": null
}
```

---

## Error Codes

| Code       | Message                  |
| ---------- | ------------------------ |
| `AUTH_001` | Invalid or expired token |

---

## Security Notes

1. **Password Storage:** Passwords are hashed using bcrypt before storage
2. **JWT Tokens:** Include userId, role, and tokenVersion
3. **Token Expiry:** 7 days for regular users, 15 minutes for admins (recommended)
4. **Token Invalidation:** Logout increments tokenVersion, invalidating all previous tokens

---

## Example Usage (cURL)

### Register:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepass123",
    "confirmPassword": "securepass123",
    "phone": "+1234567890",
    "location": "New York",
    "state": "NY",
    "street": "123 Main St",
    "city": "New York",
    "zipcode": "10001"
  }'
```

### Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### Get Profile:

```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
