# Task 2-b: Build Ratings, Reviews, and Schedule API Routes

**Task ID:** 2-b
**Agent:** Backend API Builder
**Date:** 2026-03-04
**Status:** ✅ Completed

## Summary
Built 4 backend API routes for the StreamX platform: Ratings, Reviews, Content Schedule (admin), and Schedule Execute (cron).

## Files Created

### 1. `/home/z/my-project/src/app/api/ratings/route.ts`
- **GET**: Get ratings for a content item by `contentId` and `contentType` query params. Returns `{ ratings: { average, count, distribution: [count1..count5] }, userRating: number | null }`. If authenticated, also returns the user's own rating.
- **POST**: Create or update a rating. Requires auth. Body: `{ contentId, contentType, score (1-5) }`. Upserts based on `userId+contentId+contentType` unique constraint. Validates score is integer 1-5.
- **DELETE**: Delete user's rating. Requires auth. Body: `{ contentId, contentType }`. Uses `deleteMany` with userId + contentId + contentType.

### 2. `/home/z/my-project/src/app/api/reviews/route.ts`
- **GET**: List reviews for a content item. Query params: `contentId`, `contentType`, `page` (default 1), `limit` (default 10). Returns `{ reviews: ReviewWithUser[], total, page }`. Includes user name and avatar via include.
- **POST**: Create a review. Requires auth. Body: `{ contentId, contentType, title, content }`. All fields required. Returns review with user relation.
- **PATCH**: Update a review. Requires auth. Body: `{ id, title?, content? }`. Only the review owner can edit (403 otherwise). Returns updated review.
- **DELETE**: Delete a review. Requires auth. Body: `{ id }`. Only the review owner or admin can delete (403 otherwise).

### 3. `/home/z/my-project/src/app/api/admin/schedules/route.ts`
- **GET**: List all schedules. Requires admin auth. Query param: `?executed=false` for pending only, `?executed=true` for executed only, or all if omitted. Returns `{ schedules: ContentScheduleWithContent[] }` including content title, type, status.
- **POST**: Create a schedule. Requires admin auth. Body: `{ contentId, action: "publish"|"archive", scheduledAt: ISO string }`. Validates action value, verifies content exists. Creates audit log.
- **DELETE**: Delete a schedule. Requires admin auth. Body: `{ id }`. Verifies schedule exists. Creates audit log.

### 4. `/home/z/my-project/src/app/api/admin/schedules/execute/route.ts`
- **POST**: Execute due schedules. No auth required (called by cron/system). Finds all schedules where `executed=false AND scheduledAt <= now()`. For "publish" action: updates UploadedContent status to "published". For "archive" action: updates status to "archived". Marks each schedule as executed with `executedAt` timestamp. Returns `{ executed: number }`.

## Patterns Used
- Consistent error handling with try/catch and `console.error`
- `getServerSession(authOptions)` for auth, `(session.user as Record<string, unknown>).id` for type-safe access
- Admin check: `(session.user as Record<string, unknown>).role !== "admin"` → 403
- Used `Record<string, unknown>` instead of `any` for session user type assertions (avoids ESLint `no-explicit-any` issues)
- `db` imported from `@/lib/db` (Prisma client)
- Consistent response format: `{ error: string }` for errors, `{ success: true }` for deletes

## Lint Result
0 errors, 0 warnings.
