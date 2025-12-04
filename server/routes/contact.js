/**
 * Contact Routes
 * Contact form submission and management
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/contact
 * Submit contact form
 */
router.post('/', (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const result = db.prepare(`
            INSERT INTO contact_submissions (name, email, phone, subject, message)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, email, phone || '', subject || '', message);

        // TODO: Send email notification if configured

        res.status(201).json({ 
            message: 'Message sent successfully! We will get back to you soon.',
            id: result.lastInsertRowid 
        });
    } catch (error) {
        console.error('Submit contact error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * GET /api/contact/submissions
 * Get all submissions (admin only)
 */
router.get('/submissions', authenticateToken, (req, res) => {
    try {
        const { limit = 50, offset = 0, unread } = req.query;
        
        let query = 'SELECT * FROM contact_submissions';
        const params = [];
        
        if (unread === 'true') {
            query += ' WHERE is_read = 0';
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const submissions = db.prepare(query).all(...params);
        
        // Get counts
        const total = db.prepare('SELECT COUNT(*) as count FROM contact_submissions').get().count;
        const unreadCount = db.prepare('SELECT COUNT(*) as count FROM contact_submissions WHERE is_read = 0').get().count;
        
        res.json({
            submissions,
            total,
            unread: unreadCount
        });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

/**
 * GET /api/contact/submissions/:id
 * Get single submission
 */
router.get('/submissions/:id', authenticateToken, (req, res) => {
    try {
        const submission = db.prepare('SELECT * FROM contact_submissions WHERE id = ?').get(req.params.id);
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        res.json(submission);
    } catch (error) {
        console.error('Get submission error:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});

/**
 * PUT /api/contact/submissions/:id/read
 * Mark submission as read
 */
router.put('/submissions/:id/read', authenticateToken, (req, res) => {
    try {
        const submission = db.prepare('SELECT * FROM contact_submissions WHERE id = ?').get(req.params.id);
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        db.prepare('UPDATE contact_submissions SET is_read = 1 WHERE id = ?').run(req.params.id);

        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

/**
 * DELETE /api/contact/submissions/:id
 * Delete submission
 */
router.delete('/submissions/:id', authenticateToken, (req, res) => {
    try {
        const submission = db.prepare('SELECT * FROM contact_submissions WHERE id = ?').get(req.params.id);
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        db.prepare('DELETE FROM contact_submissions WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'contact_submission', submission.id, `Deleted contact from: ${submission.name}`, req.ip);

        res.json({ message: 'Submission deleted successfully' });
    } catch (error) {
        console.error('Delete submission error:', error);
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

module.exports = router;
