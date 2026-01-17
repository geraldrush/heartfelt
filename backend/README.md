# Heartfelt Backend Image Blurring

## Overview
This backend supports a client-side face blurring workflow. The browser detects faces and uploads blurred images, while the backend stores originals privately and blurred versions publicly in R2. Face detection metadata can be stored in D1 for future features.

## Storage Layout
- `private/images/{id}.{ext}`: original uploads (private)
- `public/images/{id}.{ext}`: blurred uploads (public)

## Image Processing Flow
1. Client detects faces and blurs locally using TensorFlow.js BlazeFace.
2. Client uploads blurred image via `POST /api/stories/upload-image`.
3. Backend stores original and blurred copies in R2 and records story image links.
4. Optional: `POST /api/images/process` runs Workers AI to return face coordinates.

## Workers AI
Workers AI is configured with:
```
[ai]
binding = "AI"
```
The `POST /api/images/process` endpoint uses `@cf/facebook/detr-resnet-50` to detect persons and returns face coordinates.

## D1 Face Metadata
Migration `0003_add_face_metadata.sql` adds:
- `face_coordinates` (JSON string)
- `faces_detected` (count)

## Troubleshooting
- If images are missing, confirm R2 binding `R2_BUCKET` and bucket name.
- If AI processing fails, verify Workers AI is enabled and the binding exists.
- Ensure the D1 database has run all migrations (0001, 0002, 0003).
