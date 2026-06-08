# Task 2-a: Build Backend API Routes (Profile, Password, History, Avatar)

**Date:** 2026-03-04
**Status:** ✅ Completed

## Actions Performed:

1. **Created User Profile API** (`src/app/api/profile/route.ts`)
   - GET: Returns current user profile (id, name, email, avatar, language, autoplay, emailNotify, emailVerified, role, createdAt, updatedAt). Requires auth. Excludes password via Prisma `select`.
   - PATCH: Updates user profile fields (name, email, avatar, language, autoplay, emailNotify). Requires auth. Validates email uniqueness if email is being changed (returns 409 if taken by another user). Only updates provided fields. Returns updated user object (excluding password).

2. **Created Change Password API** (`src/app/api/profile/password/route.ts`)
   - POST: Changes user password. Requires auth. Validates currentPassword and newPassword are provided. Validates newPassword is at least 6 characters. Validates current password with bcrypt.compare. Hashes new password with bcrypt (12 rounds). Returns success message.

3. **Created Watch History API** (`src/app/api/history/route.ts`)
   - GET: Lists watch history for authenticated user with pagination (?page=1&limit=20). Returns { items, total, page }. Ordered by watchedAt desc.
   - POST: Adds or updates watch history entry. Upserts based on userId+contentId+contentType unique constraint. Updates watchedAt to now on both create and update. Accepts contentId, contentType, title, posterPath, overview, rating, releaseDate, progress, duration.
   - DELETE: Clears watch history. If body contains contentId+contentType, deletes specific item. If no contentId/contentType provided, clears all history for the user.

4. **Created Avatar Upload API** (`src/app/api/profile/avatar/route.ts`)
   - POST: Uploads avatar image. Requires auth. Accepts FormData with "file" field. Validates file type (jpg, png, gif, webp) via MIME type and extension. Max size 2MB. Saves to `/home/z/my-project/public/uploads/avatars/` directory with filename pattern `{userId}-{timestamp}.{ext}`. Updates user.avatar in database. Returns { avatar: '/uploads/avatars/filename' }.

5. **Created upload directory** (`public/uploads/avatars/`) for avatar file storage.

6. **Lint check**: 0 errors, 0 warnings.

## Files Created:
- `/home/z/my-project/src/app/api/profile/route.ts`
- `/home/z/my-project/src/app/api/profile/password/route.ts`
- `/home/z/my-project/src/app/api/history/route.ts`
- `/home/z/my-project/src/app/api/profile/avatar/route.ts`
- `/home/z/my-project/public/uploads/avatars/` (directory)

## Errors Encountered:
- None. All lint checks passed on first run.
