# Task 2-c: Build Backend API Routes (Homepage, Settings, Storage, Errors, Backup, Email)

**Date:** 2026-03-04
**Status:** ✅ Completed

## Actions Performed

### 1. Homepage Sections API — `/src/app/api/admin/homepage/route.ts`
- **GET**: List all homepage sections with items (including uploaded content details), ordered by section.order
- **POST**: Create homepage section with title, type (trending/popular/top_rated/now_playing/on_the_air/upcoming/custom), optional order and visible
- **PATCH**: Update section by id (title, order, visible)
- **DELETE**: Delete section by id (cascades to items)
- All endpoints require admin auth

### 2. Homepage Section Items API — `/src/app/api/admin/homepage/items/route.ts`
- **POST**: Add item to section with sectionId, contentId?, contentType?, uploadedId?, order?
- **PATCH**: Batch update item orders with items array [{ id, order }] using $transaction
- **DELETE**: Remove item by id
- All endpoints require admin auth

### 3. Homepage Public API — `/src/app/api/homepage/route.ts`
- **GET**: Get visible homepage sections with items and uploaded content details (id, title, type, posterUrl, backdropUrl, rating, genres, description, releaseDate, runtime, status)
- No auth required

### 4. System Settings API — `/src/app/api/admin/settings/route.ts`
- **GET**: Get all PlatformSettings as key-value pairs
- **PATCH**: Upsert settings from array [{ key, value, description? }], returns key-value pairs
- Admin-only

### 5. Storage API — `/src/app/api/admin/storage/route.ts`
- **GET**: Get storage statistics including:
  - Video storage from database (UploadedContent.videoFileSize aggregate)
  - File scanning from `/public/uploads/` subdirectories (videos, images, avatars, hls)
  - Recursive directory size calculation using `readdir`/`stat`
  - Returns: totalStorage, videoStorage, imageStorage, fileCount, breakdown object
- Admin-only

### 6. Error Logs API — `/src/app/api/admin/errors/route.ts`
- **GET**: List error logs with filtering by type and resolved status, pagination
- **PATCH**: Mark error as resolved by id
- **DELETE**: Clear all resolved errors, returns deleted count
- Admin-only

### 7. Error Report API — `/src/app/api/errors/route.ts`
- **POST**: Report an error with type (api/upload/playback/system), message, stack?, endpoint?, metadata?
- No auth required (client-side error reporting)
- Metadata is JSON-stringified before storage

### 8. Backup API — `/src/app/api/admin/backup/route.ts`
- **GET**: List all backups ordered by createdAt desc
- **POST**: Create full database backup — exports all 21 tables as JSON, saves to `/backups/` directory, creates Backup record
- **DELETE**: Delete backup by id — removes file and database record
- Admin-only

### 9. Email API — `/src/app/api/admin/email/route.ts`
- **POST**: Send email (simulated) with to, subject, type (welcome/password_reset/verification/notification), content?
  - Creates EmailLog with status "sent"
  - Logs to console instead of actually sending
- **GET**: List email logs with pagination
- Admin-only

## Errors Encountered
- None. ESLint passed cleanly with zero errors and zero warnings.

## Files Created
- `/home/z/my-project/src/app/api/admin/homepage/route.ts`
- `/home/z/my-project/src/app/api/admin/homepage/items/route.ts`
- `/home/z/my-project/src/app/api/homepage/route.ts`
- `/home/z/my-project/src/app/api/admin/settings/route.ts`
- `/home/z/my-project/src/app/api/admin/storage/route.ts`
- `/home/z/my-project/src/app/api/admin/errors/route.ts`
- `/home/z/my-project/src/app/api/errors/route.ts`
- `/home/z/my-project/src/app/api/admin/backup/route.ts`
- `/home/z/my-project/src/app/api/admin/email/route.ts`

## Directories Created
- `/home/z/my-project/src/app/api/admin/homepage/items/`
- `/home/z/my-project/src/app/api/admin/settings/`
- `/home/z/my-project/src/app/api/admin/storage/`
- `/home/z/my-project/src/app/api/admin/errors/`
- `/home/z/my-project/src/app/api/admin/backup/`
- `/home/z/my-project/src/app/api/admin/email/`
- `/home/z/my-project/src/app/api/homepage/`
- `/home/z/my-project/src/app/api/errors/`
- `/home/z/my-project/backups/`
- `/home/z/my-project/public/uploads/`
