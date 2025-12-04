/**
 * Media Routes
 * File upload and media library management
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const thumbsDir = path.join(uploadDir, 'thumbnails');
const imagesDir = path.join(uploadDir, 'images');

[uploadDir, thumbsDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, WebM'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

/**
 * Process image - create WebP and thumbnail
 */
async function processImage(filePath, filename) {
    const ext = path.extname(filename).toLowerCase();
    const baseName = path.basename(filename, ext);
    
    // Only process images
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        return { original: filePath, thumbnail: null, webp: null };
    }

    try {
        const image = sharp(filePath);
        const metadata = await image.metadata();

        // Create WebP version
        const webpPath = path.join(imagesDir, `${baseName}.webp`);
        await image
            .webp({ quality: 85 })
            .toFile(webpPath);

        // Create thumbnail (300px width)
        const thumbPath = path.join(thumbsDir, `${baseName}_thumb.webp`);
        await sharp(filePath)
            .resize(300, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(thumbPath);

        return {
            original: `/uploads/${filename}`,
            webp: `/uploads/images/${baseName}.webp`,
            thumbnail: `/uploads/thumbnails/${baseName}_thumb.webp`,
            width: metadata.width,
            height: metadata.height
        };
    } catch (error) {
        console.error('Image processing error:', error);
        return { 
            original: `/uploads/${filename}`, 
            thumbnail: null, 
            webp: null 
        };
    }
}

/**
 * GET /api/media
 * Get all media files
 */
router.get('/', authenticateToken, (req, res) => {
    try {
        const { type, limit, offset } = req.query;
        
        let query = 'SELECT * FROM media';
        const params = [];

        if (type) {
            query += ' WHERE file_type LIKE ?';
            params.push(`${type}%`);
        }

        query += ' ORDER BY created_at DESC';

        if (limit) {
            query += ` LIMIT ${parseInt(limit)}`;
            if (offset) {
                query += ` OFFSET ${parseInt(offset)}`;
            }
        }

        const media = db.prepare(query).all(...params);
        res.json(media);
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ error: 'Failed to fetch media' });
    }
});

/**
 * POST /api/media
 * Upload file(s)
 */
router.post('/', authenticateToken, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploaded = [];

        for (const file of req.files) {
            const filePath = path.join(uploadDir, file.filename);
            const processed = await processImage(filePath, file.filename);

            const result = db.prepare(`
                INSERT INTO media (filename, original_name, file_path, file_type, file_size, width, height, alt_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                file.filename,
                file.originalname,
                processed.webp || processed.original,
                file.mimetype,
                file.size,
                processed.width || null,
                processed.height || null,
                ''
            );

            const media = db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid);
            media.thumbnail = processed.thumbnail;
            uploaded.push(media);
        }

        logActivity(req.user.id, 'upload', 'media', null, `Uploaded ${uploaded.length} file(s)`, req.ip);

        res.status(201).json(uploaded);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

/**
 * PUT /api/media/:id
 * Update media metadata
 */
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const { alt_text } = req.body;
        const mediaId = req.params.id;

        const existing = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
        if (!existing) {
            return res.status(404).json({ error: 'Media not found' });
        }

        db.prepare('UPDATE media SET alt_text = ? WHERE id = ?').run(alt_text || '', mediaId);

        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
        res.json(media);
    } catch (error) {
        console.error('Update media error:', error);
        res.status(500).json({ error: 'Failed to update media' });
    }
});

/**
 * DELETE /api/media/:id
 * Delete media file
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
        
        if (!media) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Delete physical files
        const baseName = path.basename(media.filename, path.extname(media.filename));
        const filesToDelete = [
            path.join(uploadDir, media.filename),
            path.join(imagesDir, `${baseName}.webp`),
            path.join(thumbsDir, `${baseName}_thumb.webp`)
        ];

        filesToDelete.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'media', media.id, `Deleted media: ${media.original_name}`, req.ip);

        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ error: 'Failed to delete media' });
    }
});

module.exports = router;
