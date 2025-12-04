/**
 * Pages Routes
 * CRUD operations for custom pages
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/pages
 * Get all pages (public gets only published, admin gets all)
 */
router.get('/', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const isAdmin = authHeader && authHeader.startsWith('Bearer ');
        
        let pages;
        if (isAdmin) {
            pages = db.prepare('SELECT * FROM pages ORDER BY created_at DESC').all();
        } else {
            pages = db.prepare('SELECT * FROM pages WHERE is_published = 1 ORDER BY created_at DESC').all();
        }
        
        res.json(pages);
    } catch (error) {
        console.error('Get pages error:', error);
        res.status(500).json({ error: 'Failed to fetch pages' });
    }
});

/**
 * GET /api/pages/:slug
 * Get single page by slug
 */
router.get('/:slug', (req, res) => {
    try {
        const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
        
        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }

        // Check if published for public access
        const authHeader = req.headers['authorization'];
        const isAdmin = authHeader && authHeader.startsWith('Bearer ');
        
        if (!page.is_published && !isAdmin) {
            return res.status(404).json({ error: 'Page not found' });
        }
        
        res.json(page);
    } catch (error) {
        console.error('Get page error:', error);
        res.status(500).json({ error: 'Failed to fetch page' });
    }
});

/**
 * POST /api/pages
 * Create new page
 */
router.post('/', authenticateToken, (req, res) => {
    try {
        const { title, slug, content, meta_title, meta_description, meta_keywords, is_published } = req.body;

        if (!title || !slug) {
            return res.status(400).json({ error: 'Title and slug are required' });
        }

        // Check if slug exists
        const existing = db.prepare('SELECT id FROM pages WHERE slug = ?').get(slug);
        if (existing) {
            return res.status(400).json({ error: 'Slug already exists' });
        }

        const result = db.prepare(`
            INSERT INTO pages (title, slug, content, meta_title, meta_description, meta_keywords, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(title, slug, content || '', meta_title || title, meta_description || '', meta_keywords || '', is_published ? 1 : 0);

        const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(result.lastInsertRowid);

        logActivity(req.user.id, 'create', 'page', page.id, `Created page: ${title}`, req.ip);

        res.status(201).json(page);
    } catch (error) {
        console.error('Create page error:', error);
        res.status(500).json({ error: 'Failed to create page' });
    }
});

/**
 * PUT /api/pages/:id
 * Update page
 */
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const { title, slug, content, meta_title, meta_description, meta_keywords, is_published } = req.body;
        const pageId = req.params.id;

        // Check if page exists
        const existing = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId);
        if (!existing) {
            return res.status(404).json({ error: 'Page not found' });
        }

        // Check if new slug conflicts
        if (slug && slug !== existing.slug) {
            const slugExists = db.prepare('SELECT id FROM pages WHERE slug = ? AND id != ?').get(slug, pageId);
            if (slugExists) {
                return res.status(400).json({ error: 'Slug already exists' });
            }
        }

        db.prepare(`
            UPDATE pages 
            SET title = ?, slug = ?, content = ?, meta_title = ?, meta_description = ?, 
                meta_keywords = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            title || existing.title,
            slug || existing.slug,
            content !== undefined ? content : existing.content,
            meta_title || existing.meta_title,
            meta_description !== undefined ? meta_description : existing.meta_description,
            meta_keywords !== undefined ? meta_keywords : existing.meta_keywords,
            is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
            pageId
        );

        const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId);

        logActivity(req.user.id, 'update', 'page', page.id, `Updated page: ${page.title}`, req.ip);

        res.json(page);
    } catch (error) {
        console.error('Update page error:', error);
        res.status(500).json({ error: 'Failed to update page' });
    }
});

/**
 * DELETE /api/pages/:id
 * Delete page
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(req.params.id);
        
        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }

        db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'page', page.id, `Deleted page: ${page.title}`, req.ip);

        res.json({ message: 'Page deleted successfully' });
    } catch (error) {
        console.error('Delete page error:', error);
        res.status(500).json({ error: 'Failed to delete page' });
    }
});

module.exports = router;
