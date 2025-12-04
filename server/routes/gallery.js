/**
 * Gallery Routes
 * Albums and images management
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

// ============ ALBUMS ============

/**
 * GET /api/gallery/albums
 * Get all albums
 */
router.get('/albums', (req, res) => {
    try {
        const albums = db.prepare(`
            SELECT ga.*, COUNT(gi.id) as image_count
            FROM gallery_albums ga
            LEFT JOIN gallery_images gi ON ga.id = gi.album_id
            WHERE ga.is_active = 1
            GROUP BY ga.id
            ORDER BY ga.sort_order ASC, ga.created_at DESC
        `).all();
        
        res.json(albums);
    } catch (error) {
        console.error('Get albums error:', error);
        res.status(500).json({ error: 'Failed to fetch albums' });
    }
});

/**
 * GET /api/gallery/albums/:id
 * Get single album with images
 */
router.get('/albums/:id', (req, res) => {
    try {
        const album = db.prepare('SELECT * FROM gallery_albums WHERE id = ?').get(req.params.id);
        
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        const images = db.prepare(`
            SELECT * FROM gallery_images 
            WHERE album_id = ? 
            ORDER BY sort_order ASC, created_at DESC
        `).all(req.params.id);

        res.json({ ...album, images });
    } catch (error) {
        console.error('Get album error:', error);
        res.status(500).json({ error: 'Failed to fetch album' });
    }
});

/**
 * POST /api/gallery/albums
 * Create new album
 */
router.post('/albums', authenticateToken, (req, res) => {
    try {
        const { name, description, cover_image, sort_order } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Album name is required' });
        }

        const result = db.prepare(`
            INSERT INTO gallery_albums (name, description, cover_image, sort_order)
            VALUES (?, ?, ?, ?)
        `).run(name, description || '', cover_image || '', sort_order || 0);

        const album = db.prepare('SELECT * FROM gallery_albums WHERE id = ?').get(result.lastInsertRowid);

        logActivity(req.user.id, 'create', 'gallery_album', album.id, `Created album: ${name}`, req.ip);

        res.status(201).json(album);
    } catch (error) {
        console.error('Create album error:', error);
        res.status(500).json({ error: 'Failed to create album' });
    }
});

/**
 * PUT /api/gallery/albums/:id
 * Update album
 */
router.put('/albums/:id', authenticateToken, (req, res) => {
    try {
        const { name, description, cover_image, is_active, sort_order } = req.body;
        const albumId = req.params.id;

        const existing = db.prepare('SELECT * FROM gallery_albums WHERE id = ?').get(albumId);
        if (!existing) {
            return res.status(404).json({ error: 'Album not found' });
        }

        db.prepare(`
            UPDATE gallery_albums 
            SET name = ?, description = ?, cover_image = ?, is_active = ?, sort_order = ?
            WHERE id = ?
        `).run(
            name || existing.name,
            description !== undefined ? description : existing.description,
            cover_image !== undefined ? cover_image : existing.cover_image,
            is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
            sort_order !== undefined ? sort_order : existing.sort_order,
            albumId
        );

        const album = db.prepare('SELECT * FROM gallery_albums WHERE id = ?').get(albumId);

        logActivity(req.user.id, 'update', 'gallery_album', album.id, `Updated album: ${album.name}`, req.ip);

        res.json(album);
    } catch (error) {
        console.error('Update album error:', error);
        res.status(500).json({ error: 'Failed to update album' });
    }
});

/**
 * DELETE /api/gallery/albums/:id
 * Delete album and its images
 */
router.delete('/albums/:id', authenticateToken, (req, res) => {
    try {
        const album = db.prepare('SELECT * FROM gallery_albums WHERE id = ?').get(req.params.id);
        
        if (!album) {
            return res.status(404).json({ error: 'Album not found' });
        }

        // Delete album (images cascade delete)
        db.prepare('DELETE FROM gallery_albums WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'gallery_album', album.id, `Deleted album: ${album.name}`, req.ip);

        res.json({ message: 'Album deleted successfully' });
    } catch (error) {
        console.error('Delete album error:', error);
        res.status(500).json({ error: 'Failed to delete album' });
    }
});

// ============ IMAGES ============

/**
 * GET /api/gallery/images
 * Get all images (optionally by album)
 */
router.get('/images', (req, res) => {
    try {
        const { album_id } = req.query;
        
        let query = 'SELECT * FROM gallery_images';
        const params = [];

        if (album_id) {
            query += ' WHERE album_id = ?';
            params.push(album_id);
        }

        query += ' ORDER BY sort_order ASC, created_at DESC';

        const images = db.prepare(query).all(...params);
        res.json(images);
    } catch (error) {
        console.error('Get images error:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

/**
 * POST /api/gallery/images
 * Add image to album
 */
router.post('/images', authenticateToken, (req, res) => {
    try {
        const { album_id, file_path, thumbnail_path, caption, sort_order } = req.body;

        if (!file_path) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const result = db.prepare(`
            INSERT INTO gallery_images (album_id, file_path, thumbnail_path, caption, sort_order)
            VALUES (?, ?, ?, ?, ?)
        `).run(album_id || null, file_path, thumbnail_path || '', caption || '', sort_order || 0);

        const image = db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(result.lastInsertRowid);

        logActivity(req.user.id, 'create', 'gallery_image', image.id, 'Added gallery image', req.ip);

        res.status(201).json(image);
    } catch (error) {
        console.error('Add image error:', error);
        res.status(500).json({ error: 'Failed to add image' });
    }
});

/**
 * PUT /api/gallery/images/:id
 * Update image
 */
router.put('/images/:id', authenticateToken, (req, res) => {
    try {
        const { album_id, caption, sort_order } = req.body;
        const imageId = req.params.id;

        const existing = db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(imageId);
        if (!existing) {
            return res.status(404).json({ error: 'Image not found' });
        }

        db.prepare(`
            UPDATE gallery_images 
            SET album_id = ?, caption = ?, sort_order = ?
            WHERE id = ?
        `).run(
            album_id !== undefined ? album_id : existing.album_id,
            caption !== undefined ? caption : existing.caption,
            sort_order !== undefined ? sort_order : existing.sort_order,
            imageId
        );

        const image = db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(imageId);
        res.json(image);
    } catch (error) {
        console.error('Update image error:', error);
        res.status(500).json({ error: 'Failed to update image' });
    }
});

/**
 * DELETE /api/gallery/images/:id
 * Delete image
 */
router.delete('/images/:id', authenticateToken, (req, res) => {
    try {
        const image = db.prepare('SELECT * FROM gallery_images WHERE id = ?').get(req.params.id);
        
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        db.prepare('DELETE FROM gallery_images WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'gallery_image', image.id, 'Deleted gallery image', req.ip);

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

module.exports = router;
