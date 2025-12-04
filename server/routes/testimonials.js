/**
 * Testimonials Routes
 * CRUD operations for client testimonials
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/testimonials
 * Get all testimonials (public gets only approved)
 */
router.get('/', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const isAdmin = authHeader && authHeader.startsWith('Bearer ');
        
        let testimonials;
        if (isAdmin) {
            testimonials = db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC, created_at DESC').all();
        } else {
            testimonials = db.prepare('SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY sort_order ASC').all();
        }
        
        res.json(testimonials);
    } catch (error) {
        console.error('Get testimonials error:', error);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

/**
 * GET /api/testimonials/:id
 * Get single testimonial
 */
router.get('/:id', (req, res) => {
    try {
        const testimonial = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
        
        if (!testimonial) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }
        
        res.json(testimonial);
    } catch (error) {
        console.error('Get testimonial error:', error);
        res.status(500).json({ error: 'Failed to fetch testimonial' });
    }
});

/**
 * POST /api/testimonials
 * Create new testimonial
 */
router.post('/', authenticateToken, (req, res) => {
    try {
        const { 
            client_name, client_photo, client_title, 
            content, rating, is_approved, sort_order 
        } = req.body;

        if (!client_name || !content) {
            return res.status(400).json({ error: 'Client name and content are required' });
        }

        const result = db.prepare(`
            INSERT INTO testimonials (client_name, client_photo, client_title, content, rating, is_approved, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            client_name,
            client_photo || '',
            client_title || '',
            content,
            rating || 5,
            is_approved ? 1 : 0,
            sort_order || 0
        );

        const testimonial = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(result.lastInsertRowid);

        logActivity(req.user.id, 'create', 'testimonial', testimonial.id, `Created testimonial from: ${client_name}`, req.ip);

        res.status(201).json(testimonial);
    } catch (error) {
        console.error('Create testimonial error:', error);
        res.status(500).json({ error: 'Failed to create testimonial' });
    }
});

/**
 * PUT /api/testimonials/:id
 * Update testimonial
 */
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const testimonialId = req.params.id;
        const { 
            client_name, client_photo, client_title, 
            content, rating, is_approved, sort_order 
        } = req.body;

        const existing = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(testimonialId);
        if (!existing) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }

        db.prepare(`
            UPDATE testimonials 
            SET client_name = ?, client_photo = ?, client_title = ?, 
                content = ?, rating = ?, is_approved = ?, sort_order = ?
            WHERE id = ?
        `).run(
            client_name || existing.client_name,
            client_photo !== undefined ? client_photo : existing.client_photo,
            client_title !== undefined ? client_title : existing.client_title,
            content !== undefined ? content : existing.content,
            rating !== undefined ? rating : existing.rating,
            is_approved !== undefined ? (is_approved ? 1 : 0) : existing.is_approved,
            sort_order !== undefined ? sort_order : existing.sort_order,
            testimonialId
        );

        const testimonial = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(testimonialId);

        logActivity(req.user.id, 'update', 'testimonial', testimonial.id, `Updated testimonial from: ${testimonial.client_name}`, req.ip);

        res.json(testimonial);
    } catch (error) {
        console.error('Update testimonial error:', error);
        res.status(500).json({ error: 'Failed to update testimonial' });
    }
});

/**
 * DELETE /api/testimonials/:id
 * Delete testimonial
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const testimonial = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
        
        if (!testimonial) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }

        db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'testimonial', testimonial.id, `Deleted testimonial from: ${testimonial.client_name}`, req.ip);

        res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
        console.error('Delete testimonial error:', error);
        res.status(500).json({ error: 'Failed to delete testimonial' });
    }
});

module.exports = router;
