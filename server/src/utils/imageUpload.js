import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';

// Ensure upload directories exist
const uploadDir = 'uploads';
const DIRS = {
  medicine: path.join(uploadDir, 'medicines'),
  profile:  path.join(uploadDir, 'profiles'),
  receipt:  path.join(uploadDir, 'receipts'),
};

async function ensureDirectories() {
  await Promise.all(Object.values(DIRS).map(d => fs.mkdir(d, { recursive: true })));
}
ensureDirectories().catch(console.error);

// ─── Multer ──────────────────────────────────────────────────────────────────

const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function targetDir(type) {
  return DIRS[type] || DIRS.medicine;
}

/**
 * Determine the correct sharp pipeline for a given mime type.
 * We always store as JPEG for space efficiency unless the source is a PNG
 * with transparency, in which case we store as WebP.
 */
function buildPipeline(instance, mime) {
  if (mime === 'image/png') {
    // WebP preserves transparency and is smaller than PNG
    return instance.webp({ quality: 85 });
  }
  if (mime === 'image/webp') {
    return instance.webp({ quality: 85 });
  }
  // JPEG / JPG → JPEG
  return instance.jpeg({ quality: 85, progressive: true });
}

function outputExtension(mime) {
  if (mime === 'image/png' || mime === 'image/webp') return '.webp';
  return '.jpg';
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resize, compress, and save an image.
 * Returns the relative URL path stored in the DB (e.g. "/medicines/abc.jpg").
 */
export async function optimizeAndSaveImage(buffer, type = 'medicine', originalName, mime = 'image/jpeg') {
  const ext = outputExtension(mime);
  const filename = `${nanoid()}-${Date.now()}${ext}`;
  const outputPath = path.join(targetDir(type), filename);

  const pipeline = buildPipeline(
    sharp(buffer).resize(800, 800, { fit: 'inside', withoutEnlargement: true }),
    mime
  );
  await pipeline.toFile(outputPath);

  return `/${type}s/${filename}`;
}

/**
 * Create a 200×200 square thumbnail.
 * Returns the relative URL path.
 */
export async function generateThumbnail(buffer, type = 'medicine', originalName, mime = 'image/jpeg') {
  const ext = outputExtension(mime);
  const filename = `thumb-${nanoid()}-${Date.now()}${ext}`;
  const outputPath = path.join(targetDir(type), filename);

  const pipeline = buildPipeline(
    sharp(buffer).resize(200, 200, { fit: 'cover' }),
    mime
  );
  await pipeline.toFile(outputPath);

  return `/${type}s/${filename}`;
}

/**
 * Delete an image file from disk given its relative DB path.
 * Silently ignores missing files.
 */
export async function deleteImage(imagePath) {
  if (!imagePath) return;
  const fullPath = path.join(uploadDir, imagePath);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to delete image:', err.message);
    }
  }
}

/**
 * Read image metadata and reject if smaller than minWidth × minHeight.
 */
export async function validateImageDimensions(buffer, minWidth = 50, minHeight = 50) {
  const metadata = await sharp(buffer).metadata();
  if (metadata.width < minWidth || metadata.height < minHeight) {
    throw new Error(`Image must be at least ${minWidth}×${minHeight} pixels`);
  }
  return metadata;
}
