# Admin Dashboard Backend Implementation

## Overview

This document summarizes the implementation of the admin dashboard backend for the Eswatini Facts Platform (Task 12).

## Implementation Status

✅ **COMPLETED** - All admin dashboard backend functionality has been implemented and tested.

## Components Implemented

### 1. Admin Controller (`src/controllers/adminController.js`)

The admin controller provides comprehensive administrative functionality:

#### Dashboard Statistics
- **Endpoint**: `GET /api/v1/admin/dashboard/stats`
- **Functionality**: Returns comprehensive dashboard statistics including:
  - User counts (total, admins, regular users)
  - Content metrics (blog posts by status, data points)
  - Newsletter subscriber count
  - Recent activity (last 7 days)
  - System health indicators (uptime, memory usage, Node version)

#### User Management
- **List Users**: `GET /api/v1/admin/users`
  - Pagination support (limit, offset)
  - Role filtering
  - Returns decrypted user data
- **View User**: `GET /api/v1/admin/users/:id`
  - Detailed user information
  - Saved content count
- **Update User**: `PUT /api/v1/admin/users/:id`
  - Update role (user/admin)
  - Update email verification status
  - Audit logging for all changes
- **Deactivate User**: `DELETE /api/v1/admin/users/:id`
  - Prevents self-deactivation
  - Audit logging for deactivation

#### Content Moderation
- **Moderate Content**: `POST /api/v1/admin/content/:id/moderate`
- **Actions Supported**:
  - **Approve**: Publishes draft content
  - **Edit**: Modifies title, content, or excerpt
  - **Remove**: Deletes content
- **Audit logging**: All moderation actions are logged

#### Data Import
- **Import Data**: `POST /api/v1/admin/data/import`
- **Features**:
  - Bulk data point import
  - CSV/JSON validation
  - Referential integrity checks
  - Transaction support (rollback on error)
  - Detailed error reporting
  - Audit logging

#### Audit Logs
- **Get Audit Logs**: `GET /api/v1/admin/audit-logs`
- **Filtering Options**:
  - By user ID
  - By action type
  - By resource type
  - By date range (start/end)
  - Pagination support

### 2. Audit Logger Utility (`src/utils/auditLogger.js`)

Comprehensive audit logging system:

#### Functions
- **`logAuditAction()`**: Creates audit log entries with:
  - User ID
  - Action type
  - Resource type and ID
  - Additional details (JSON)
  - IP address
  - User agent
  - Timestamp (automatic)

- **`auditMiddleware()`**: Middleware for automatic audit logging
  - Intercepts response
  - Logs successful operations
  - Captures request context

- **`getAuditLogs()`**: Query audit logs with filtering and pagination

#### Features
- Non-blocking (failures don't break main operations)
- Comprehensive filtering
- Chronological ordering
- Preserves logs even when resources are deleted

### 3. Admin Routes (`src/routes/admin.js`)

All admin routes are protected by:
- `authenticateToken` middleware (requires valid JWT)
- `requireAdmin` middleware (requires admin role)

#### Route Structure
```
/api/v1/admin
├── /dashboard/stats (GET)
├── /users (GET)
├── /users/:id (GET, PUT, DELETE)
├── /content/:id/moderate (POST)
├── /data/import (POST)
└── /audit-logs (GET)
```

### 4. Server Integration (`src/server.js`)

Admin routes have been integrated into the main server:
- Import statement added
- Route mounted at `/api/v1/admin`
- All routes protected by authentication and authorization

## Validation

All endpoints include comprehensive input validation:

### User Management
- Role must be 'user' or 'admin'
- Email verified must be boolean

### Content Moderation
- Action must be 'approve', 'edit', or 'remove'
- Content and title cannot be empty when editing

### Data Import
- Data must be non-empty array
- Each data point requires:
  - Category (required)
  - Metric name (required)
  - Metric value (numeric, required)
  - Date recorded (ISO 8601 format, required)

## Error Handling

Consistent error response format across all endpoints:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "timestamp": "ISO 8601 timestamp"
  }
}
```

### Error Codes
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `NO_UPDATES`: No valid fields to update
- `CANNOT_DEACTIVATE_SELF`: Admin cannot deactivate own account
- `INTERNAL_ERROR`: Server error

## Security Features

### Authentication & Authorization
- JWT token required for all endpoints
- Admin role required for all operations
- Self-deactivation prevention

### Data Protection
- PII encryption (email, name) using AES-256
- Password hashing with bcrypt
- Audit logging for all administrative actions

### Input Validation
- Express-validator for request validation
- SQL injection prevention (parameterized queries)
- Transaction support for data integrity

## Property-Based Testing

All three correctness properties have been implemented and tested:

### Property 31: Content Moderation Effects ✅ PASSED
**Validates**: Requirements 10.2

Tests that moderation actions (approve, edit, remove) immediately reflect in content state:
- Approval changes status to published
- Edit updates content immediately
- Removal deletes content
- Unpublish changes status to draft
- Multiple actions in sequence work correctly

**Test File**: `tests/content-moderation.pbt.test.js`
**Runs**: 100 iterations per property
**Status**: All tests passing

### Property 32: User Management Operations ✅ PASSED
**Validates**: Requirements 10.3

Tests that user management operations immediately reflect in account state:
- View operation retrieves all user data
- Edit operation updates user fields
- Deactivate operation marks account inactive
- Multiple operations in sequence work correctly
- Data integrity maintained during edits
- Multiple users can be viewed simultaneously

**Test File**: `tests/user-management.pbt.test.js`
**Runs**: 100 iterations per property
**Status**: All tests passing

### Property 34: Audit Log Completeness ✅ PASSED
**Validates**: Requirements 10.5

Tests that all administrative actions create complete audit logs:
- All required fields present (user ID, action type, timestamp, resource)
- User management actions logged
- Content moderation actions logged
- Data import actions logged
- Chronological order maintained
- Queryable by user, action, and resource
- Logs preserved after resource deletion
- Concurrent actions handled correctly

**Test File**: `tests/audit-logging.pbt.test.js`
**Runs**: 100 iterations per property
**Status**: All tests passing

## Requirements Coverage

### Requirement 10.1: Dashboard Statistics ✅
- User count, content metrics, system health displayed
- Real-time statistics from database

### Requirement 10.2: Content Moderation ✅
- Approve, edit, remove actions implemented
- Immediate effect on content state
- Audit logging for all actions

### Requirement 10.3: User Management ✅
- View, edit, deactivate operations implemented
- Role management
- Email verification management
- Audit logging for all actions

### Requirement 10.4: Data Import ✅
- CSV/JSON validation
- Referential integrity maintained
- Transaction support
- Error reporting
- Audit logging

### Requirement 10.5: Audit Logging ✅
- All administrative actions logged
- Timestamp, user ID, action type, affected resources captured
- Queryable with filtering
- Pagination support

## API Documentation

### Dashboard Statistics
```http
GET /api/v1/admin/dashboard/stats
Authorization: Bearer <admin_jwt_token>

Response:
{
  "success": true,
  "data": {
    "users": { "total": 150, "admins": 5, "regular": 145 },
    "content": {
      "totalPosts": 45,
      "postsByStatus": { "draft": 10, "published": 35 },
      "dataPoints": 1250
    },
    "newsletter": { "subscribers": 320 },
    "recentActivity": [...],
    "systemHealth": { "database": "healthy", "uptime": 86400, ... }
  }
}
```

### List Users
```http
GET /api/v1/admin/users?role=user&limit=50&offset=0
Authorization: Bearer <admin_jwt_token>

Response:
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Moderate Content
```http
POST /api/v1/admin/content/:id/moderate
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "action": "approve",
  "title": "Updated Title",
  "content": "Updated content"
}

Response:
{
  "success": true,
  "data": {
    "message": "Content approved successfully",
    "post": { "id": "...", "title": "...", "status": "published" }
  }
}
```

### Import Data
```http
POST /api/v1/admin/data/import
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "sourceId": "uuid",
  "data": [
    {
      "category": "Economy",
      "metric_name": "GDP Growth",
      "metric_value": 3.5,
      "metric_unit": "%",
      "date_recorded": "2024-01-01"
    }
  ]
}

Response:
{
  "success": true,
  "data": {
    "message": "Data import completed",
    "imported": 1,
    "errors": 0,
    "details": { "imported": [...], "errors": [] }
  }
}
```

### Get Audit Logs
```http
GET /api/v1/admin/audit-logs?userId=uuid&actionType=USER_UPDATED&limit=50
Authorization: Bearer <admin_jwt_token>

Response:
{
  "success": true,
  "data": {
    "logs": [...],
    "pagination": {
      "total": 250,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

## Database Schema

The implementation uses existing database tables:

### audit_logs
- `id` (UUID, primary key)
- `user_id` (UUID, references users)
- `action_type` (VARCHAR)
- `resource_type` (VARCHAR)
- `resource_id` (VARCHAR)
- `details` (JSONB)
- `ip_address` (INET)
- `user_agent` (TEXT)
- `created_at` (TIMESTAMP)

Indexes:
- `idx_audit_logs_user` on `user_id`
- `idx_audit_logs_action` on `action_type`
- `idx_audit_logs_resource` on `(resource_type, resource_id)`
- `idx_audit_logs_created` on `created_at`

## Testing Results

All property-based tests passed successfully:

```
Content Moderation Effects Property Tests
  ✔ should immediately reflect approval (publish) action on content
  ✔ should immediately reflect edit action on content
  ✔ should immediately reflect removal (delete) action on content
  ✔ should immediately reflect unpublish action on content
  ✔ should handle multiple moderation actions in sequence
  
User Management Operations Property Tests
  ✔ should immediately reflect view operation on user account
  ✔ should immediately reflect edit operation on user account
  ✔ should immediately reflect deactivate operation on user account
  ✔ should handle multiple user management operations in sequence
  ✔ should maintain data integrity when editing user accounts
  ✔ should allow viewing multiple users simultaneously
  
Audit Log Completeness Property Tests
  ✔ should create audit log entry with all required fields
  ✔ should create audit log for user management actions
  ✔ should create audit log for content moderation actions
  ✔ should create audit log for data import actions
  ✔ should maintain chronological order of audit logs
  ✔ should allow querying audit logs by user, action type, and resource
  ✔ should preserve audit logs even when referenced resources are deleted
  ✔ should handle multiple concurrent administrative actions
```

**Total Tests**: 19
**Passed**: 19
**Failed**: 0

## Next Steps

The admin dashboard backend is now complete. The next task would be:

**Task 13**: Implement data visualization and aggregation backend (already completed)

**Task 14**: Enhance frontend interactive visualizations

This will involve:
- Creating admin dashboard UI
- Connecting to the admin API endpoints
- Building user management interface
- Building content moderation interface
- Building data import interface
- Building audit log viewer

## Notes

- All admin operations require authentication and admin role
- PII data is encrypted at rest and decrypted for display
- Audit logging is non-blocking and won't fail main operations
- Transaction support ensures data integrity during imports
- Comprehensive error handling with consistent response format
- Property-based tests provide high confidence in correctness

## Files Modified/Created

### Created
- `backend/src/routes/admin.js` - Admin route definitions
- `backend/ADMIN_DASHBOARD_IMPLEMENTATION.md` - This documentation

### Modified
- `backend/src/server.js` - Added admin routes import and mounting

### Existing (Already Implemented)
- `backend/src/controllers/adminController.js` - Admin controller with all functionality
- `backend/src/utils/auditLogger.js` - Audit logging utility
- `backend/tests/content-moderation.pbt.test.js` - Property test for content moderation
- `backend/tests/user-management.pbt.test.js` - Property test for user management
- `backend/tests/audit-logging.pbt.test.js` - Property test for audit logging
- `backend/src/middleware/auth.js` - Authentication middleware (includes requireAdmin)
- `backend/src/database/schema.sql` - Database schema (includes audit_logs table)

