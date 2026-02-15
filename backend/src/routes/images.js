import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { imagesRateLimit } from '../middleware/rateLimit.js';
import { getDb } from '../utils/db.js';

const images = new Hono();

images.post('/process', imagesRateLimit, authMiddleware, async (c) => {
  const body = await c.req.json().catch(() => null);
  const imageId = body?.image_id;
  const storyId = body?.story_id;

  if (!imageId || !storyId) {
    return c.json({ error: 'image_id and story_id are required.' }, 400);
  }

  const originalKey = `private/images/${imageId}`;
  const db = getDb(c);

  try {
    const object = await c.env.R2_BUCKET.get(originalKey);
    if (!object) {
      await db
        .prepare(
          'UPDATE story_images SET processing_status = ? WHERE story_id = ? AND original_url = ?'
        )
        .bind('failed', storyId, originalKey)
        .run();
      return c.json({ error: 'Image not found.' }, 404);
    }

    if (!c.env.AI) {
      throw new Error('AI binding is not configured.');
    }

    const imageBuffer = await object.arrayBuffer();
    const aiResult = await c.env.AI.run('@cf/lykon/face-detection', {
      image: [...new Uint8Array(imageBuffer)],
    });

    const results =
      aiResult?.faces || aiResult?.result?.faces || aiResult?.results || aiResult?.items || [];
    const faces = Array.isArray(results)
      ? results
          .filter((item) => {
            const label = item.label || item.class || item.category;
            const score = item.score ?? item.confidence ?? item.probability ?? 0;
            return !label || label === 'face' ? score >= 0.6 : false;
          })
          .map((item) => {
            const box = item.box || item.bounding_box || item.bbox || item.face || {};
            const x = box.x ?? box.left ?? box.xmin ?? 0;
            const y = box.y ?? box.top ?? box.ymin ?? 0;
            const width = box.width ?? (box.xmax ? box.xmax - x : 0);
            const height = box.height ?? (box.ymax ? box.ymax - y : 0);
            return {
              x,
              y,
              width,
              height,
              confidence: item.score ?? item.confidence ?? item.probability ?? 0,
            };
          })
      : [];

    await db
      .prepare(
        'UPDATE story_images SET processing_status = ?, face_coordinates = ?, faces_detected = ? WHERE story_id = ? AND original_url = ?'
      )
      .bind('completed', JSON.stringify(faces), faces.length, storyId, originalKey)
      .run();

    return c.json({ faces });
  } catch (error) {
    await db
      .prepare(
        'UPDATE story_images SET processing_status = ? WHERE story_id = ? AND original_url = ?'
      )
      .bind('failed', storyId, originalKey)
      .run();

    return c.json({ error: 'Image processing failed.' }, 500);
  }
});

export default images;
