---
Task ID: 7
Agent: Security & Analytics Backend Agent
Task: Create security and analytics API routes

Work Log:
- Created rate limiting utility at /src/lib/rate-limit.ts with checkRateLimit() and getClientIp() functions
- Created security dashboard API at /src/app/api/admin/security/route.ts (GET - admin only)
- Created device management API at /src/app/api/admin/devices/route.ts (GET list + DELETE revoke - admin only)
- Created enhanced analytics API at /src/app/api/admin/analytics/enhanced/route.ts (GET - admin only)
- Created device registration API at /src/app/api/device/route.ts (POST - authenticated)
- Created rate limit management API at /src/app/api/admin/rate-limits/route.ts (GET - admin only)
- All endpoints use proper auth checking via getServerSession + role verification
- Admin-only endpoints return 403 for non-admin users
- Device registration uses upsert pattern (findFirst by userId+fingerprint, then update or create)
- Enhanced analytics calculates DAU/WAU/MAU from distinct userIds in UserBehavior table
- Peak hours computed by grouping UserBehavior createdAt by hour of day
- Search analytics include zero-result searches and search-to-play rate
- Device breakdown from UserDevice table, browser breakdown from browser field
- Rate limit utility supports configurable window and max requests, logs blocked IPs
- Device revocation creates audit log entries
- All files pass ESLint with zero errors/warnings
- Dev server running without errors

Stage Summary:
- All 5 API route files + 1 rate-limit utility created
- Enhanced analytics provides DAU/WAU/MAU, content analytics, engagement metrics, search analytics, device breakdown
- Security APIs provide device tracking and rate limiting visibility
- Device registration API supports upsert by userId + fingerprint
- Rate limit management provides IP summary with blocked counts
- Clean lint pass, dev server healthy
