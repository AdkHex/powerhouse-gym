/**
 * Trainers Routes
 * CRUD operations for trainer profiles
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/trainers
 * Get all trainers
 */
router.get('/', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const isAdmin = authHeader && authHeader.startsWith('Bearer ');
        
        let trainers;
        if (isAdmin) {
            trainers = db.prepare('SELECT * FROM trainers ORDER BY sort_order ASC, created_at DESC').all();
        } else {
            trainers = db.prepare('SELECT * FROM trainers WHERE is_active = 1 ORDER BY sort_order ASC').all();
        }
        
        res.json(trainers);
    } catch (error) {
        console.error('Get trainers error:', error);
        res.status(500).json({ error: 'Failed to fetch trainers' });
    }
});

/**
 * GET /api/trainers/:id
 * Get single trainer
 */
router.get('/:id', (req, res) => {
    try {
        const trainer = db.prepare('SELECT * FROM trainers WHERE id = ?').get(req.params.id);
        
        if (!trainer) {
            return res.status(404).json({ error: 'Trainer not found' });
        }
        
        res.json(trainer);
    } catch (error) {
        console.error('Get trainer error:', error);
        res.status(500).json({ error: 'Failed to fetch trainer' });
    }
});

/**
 * POST /api/trainers
 * Create new trainer
 */
router.post('/', authenticateToken, (req, res) => {
    try {
        const { 
            name, specialty, bio, photo, email, phone,
            social_facebook, social_instagram, social_twitter,
            certifications, is_active, sort_order 
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = db.prepare(`
            INSERT INTO trainers (name, specialty, bio, photo, email, phone, 
                social_facebook, social_instagram, social_twitter, certifications, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            name, 
            specialty || '', 
            bio || '', 
            photo || '', 
            email || '', 
            phone || '',
            social_facebook || '',
            social_instagram || '',
            social_twitter || '',
            certifications || '',
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            sort_order || 0
        );

        const trainer = db.prepare('SELECT * FROM trainers WHERE id = ?').get(result.lastInsertRowid);

        logActivity(req.user.id, 'create', 'trainer', trainer.id, `Created trainer: ${name}`, req.ip);

        res.status(201).json(trainer);
    } catch (error) {
        console.error('Create trainer error:', error);
        res.status(500).json({ error: 'Failed to create trainer' });
    }
});

/**
 * PUT /api/trainers/:id
 * Update trainer
 */
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const trainerId = req.params.id;
        const { 
            name, specialty, bio, photo, email, phone,
            social_facebook, social_instagram, social_twitter,
            certifications, is_active, sort_order 
        } = req.body;

        const existing = db.prepare('SELECT * FROM trainers WHERE id = ?').get(trainerId);
        if (!existing) {
            return res.status(404).json({ error: 'Trainer not found' });
        }

        db.prepare(`
            UPDATE trainers 
            SET name = ?, specialty = ?, bio = ?, photo = ?, email = ?, phone = ?,
                social_facebook = ?, social_instagram = ?, social_twitter = ?,
                certifications = ?, is_active = ?, sort_order = ?
            WHERE id = ?
        `).run(
            name || existing.name,
            specialty !== undefined ? specialty : existing.specialty,
            bio !== undefined ? bio : existing.bio,
            photo !== undefined ? photo : existing.photo,
            email !== undefined ? email : existing.email,
            phone !== undefined ? phone : existing.phone,
            social_facebook !== undefined ? social_facebook : existing.social_facebook,
            social_instagram !== undefined ? social_instagram : existing.social_instagram,
            social_twitter !== undefined ? social_twitter : existing.social_twitter,
            certifications !== undefined ? certifications : existing.certifications,
            is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
            sort_order !== undefined ? sort_order : existing.sort_order,
            trainerId
        );

        const trainer = db.prepare('SELECT * FROM trainers WHERE id = ?').get(trainerId);

        logActivity(req.user.id, 'update', 'trainer', trainer.id, `Updated trainer: ${trainer.name}`, req.ip);

        res.json(trainer);
    } catch (error) {
        console.error('Update trainer error:', error);
        res.status(500).json({ error: 'Failed to update trainer' });
    }
});

/**
 * DELETE /api/trainers/:id
 * Delete trainer
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const trainer = db.prepare('SELECT * FROM trainers WHERE id = ?').get(req.params.id);
        
        if (!trainer) {
            return res.status(404).json({ error: 'Trainer not found' });
        }

        db.prepare('DELETE FROM trainers WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'trainer', trainer.id, `Deleted trainer: ${trainer.name}`, req.ip);

        res.json({ message: 'Trainer deleted successfully' });
    } catch (error) {
        console.error('Delete trainer error:', error);
        res.status(500).json({ error: 'Failed to delete trainer' });
    }
});

module.exports = router;
