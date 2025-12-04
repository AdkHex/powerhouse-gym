/**
 * Classes Routes
 * CRUD operations for fitness classes
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/classes
 * Get all classes
 */
router.get('/', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const isAdmin = authHeader && authHeader.startsWith('Bearer ');
        
        let query = `
            SELECT c.*, t.name as trainer_name, t.photo as trainer_photo
            FROM classes c
            LEFT JOIN trainers t ON c.trainer_id = t.id
        `;
        
        if (!isAdmin) {
            query += ' WHERE c.is_active = 1';
        }
        
        query += ' ORDER BY c.sort_order ASC, c.created_at DESC';
        
        const classes = db.prepare(query).all();
        res.json(classes);
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Failed to fetch classes' });
    }
});

/**
 * GET /api/classes/:id
 * Get single class with trainer info
 */
router.get('/:id', (req, res) => {
    try {
        const classItem = db.prepare(`
            SELECT c.*, t.name as trainer_name, t.photo as trainer_photo, t.specialty as trainer_specialty
            FROM classes c
            LEFT JOIN trainers t ON c.trainer_id = t.id
            WHERE c.id = ?
        `).get(req.params.id);
        
        if (!classItem) {
            return res.status(404).json({ error: 'Class not found' });
        }
        
        res.json(classItem);
    } catch (error) {
        console.error('Get class error:', error);
        res.status(500).json({ error: 'Failed to fetch class' });
    }
});

/**
 * POST /api/classes
 * Create new class
 */
router.post('/', authenticateToken, (req, res) => {
    try {
        const { 
            name, description, short_description, image, trainer_id,
            schedule, duration, capacity, price, difficulty, is_active, sort_order 
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = db.prepare(`
            INSERT INTO classes (name, description, short_description, image, trainer_id,
                schedule, duration, capacity, price, difficulty, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            name,
            description || '',
            short_description || '',
            image || '',
            trainer_id || null,
            schedule || '',
            duration || 60,
            capacity || 20,
            price || 0,
            difficulty || 'intermediate',
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            sort_order || 0
        );

        const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);

        logActivity(req.user.id, 'create', 'class', classItem.id, `Created class: ${name}`, req.ip);

        res.status(201).json(classItem);
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ error: 'Failed to create class' });
    }
});

/**
 * PUT /api/classes/:id
 * Update class
 */
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const classId = req.params.id;
        const { 
            name, description, short_description, image, trainer_id,
            schedule, duration, capacity, price, difficulty, is_active, sort_order 
        } = req.body;

        const existing = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
        if (!existing) {
            return res.status(404).json({ error: 'Class not found' });
        }

        db.prepare(`
            UPDATE classes 
            SET name = ?, description = ?, short_description = ?, image = ?, trainer_id = ?,
                schedule = ?, duration = ?, capacity = ?, price = ?, difficulty = ?, 
                is_active = ?, sort_order = ?
            WHERE id = ?
        `).run(
            name || existing.name,
            description !== undefined ? description : existing.description,
            short_description !== undefined ? short_description : existing.short_description,
            image !== undefined ? image : existing.image,
            trainer_id !== undefined ? trainer_id : existing.trainer_id,
            schedule !== undefined ? schedule : existing.schedule,
            duration !== undefined ? duration : existing.duration,
            capacity !== undefined ? capacity : existing.capacity,
            price !== undefined ? price : existing.price,
            difficulty !== undefined ? difficulty : existing.difficulty,
            is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
            sort_order !== undefined ? sort_order : existing.sort_order,
            classId
        );

        const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);

        logActivity(req.user.id, 'update', 'class', classItem.id, `Updated class: ${classItem.name}`, req.ip);

        res.json(classItem);
    } catch (error) {
        console.error('Update class error:', error);
        res.status(500).json({ error: 'Failed to update class' });
    }
});

/**
 * DELETE /api/classes/:id
 * Delete class
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const classItem = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
        
        if (!classItem) {
            return res.status(404).json({ error: 'Class not found' });
        }

        db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'class', classItem.id, `Deleted class: ${classItem.name}`, req.ip);

        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: 'Failed to delete class' });
    }
});

module.exports = router;
