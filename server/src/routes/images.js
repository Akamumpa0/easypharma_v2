import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { medicines, users } from '../db/schema.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  upload,
  optimizeAndSaveImage,
  generateThumbnail,
  deleteImage,
  validateImageDimensions,
} from '../utils/imageUpload.js';

const router = Router();

// POST /api/images/medicine/:medicineId - Upload medicine image
router.post(
  '/medicine/:medicineId',
  requireAuth,
  requireRole('admin'),
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const [medicine] = await db.select()
        .from(medicines)
        .where(eq(medicines.id, req.params.medicineId));

      if (!medicine) {
        return res.status(404).json({ error: 'Medicine not found' });
      }

      // Validate dimensions
      await validateImageDimensions(req.file.buffer, 200, 200);

      // Delete old image if exists
      if (medicine.imageUrl) {
        await deleteImage(medicine.imageUrl);
      }

      // Optimize and save — pass mime type so sharp picks the right codec
      const imagePath = await optimizeAndSaveImage(
        req.file.buffer,
        'medicine',
        req.file.originalname,
        req.file.mimetype
      );

      // Update database
      const [updated] = await db.update(medicines)
        .set({
          imageUrl: imagePath,
          updatedAt: new Date(),
        })
        .where(eq(medicines.id, medicine.id))
        .returning();

      res.json({
        id: updated.id,
        imageUrl: updated.imageUrl,
        message: 'Image uploaded successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/images/medicine/:medicineId - Delete medicine image
router.delete(
  '/medicine/:medicineId',
  requireAuth,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const [medicine] = await db.select()
        .from(medicines)
        .where(eq(medicines.id, req.params.medicineId));

      if (!medicine) {
        return res.status(404).json({ error: 'Medicine not found' });
      }

      if (!medicine.imageUrl) {
        return res.status(404).json({ error: 'No image to delete' });
      }

      // Delete file
      await deleteImage(medicine.imageUrl);

      // Update database
      await db.update(medicines)
        .set({
          imageUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(medicines.id, medicine.id));

      res.json({ message: 'Image deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/images/profile - Upload user profile photo
router.post(
  '/profile',
  requireAuth,
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, req.user.id));

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate dimensions
      await validateImageDimensions(req.file.buffer, 100, 100);

      // Delete old image if exists
      if (user.profilePhoto) {
        await deleteImage(user.profilePhoto);
      }

      // Optimize and save
      const imagePath = await optimizeAndSaveImage(
        req.file.buffer,
        'profile',
        req.file.originalname,
        req.file.mimetype
      );

      // Generate thumbnail
      const thumbnailPath = await generateThumbnail(
        req.file.buffer,
        'profile',
        req.file.originalname,
        req.file.mimetype
      );

      // Update database
      const [updated] = await db.update(users)
        .set({
          profilePhoto: imagePath,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning({
          id: users.id,
          profilePhoto: users.profilePhoto,
        });

      res.json({
        id: updated.id,
        profilePhoto: updated.profilePhoto,
        thumbnail: thumbnailPath,
        message: 'Profile photo uploaded successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/images/profile - Delete user profile photo
router.delete('/profile', requireAuth, async (req, res, next) => {
  try {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.profilePhoto) {
      return res.status(404).json({ error: 'No profile photo to delete' });
    }

    // Delete file
    await deleteImage(user.profilePhoto);

    // Update database
    await db.update(users)
      .set({
        profilePhoto: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({ message: 'Profile photo deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
