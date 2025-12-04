/**
 * Membership Routes
 * CRUD operations for membership plans
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/membership
 * Get all membership plans
 */
router.get('/', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const isAdmin = authHeader && authHeader.startsWith('Bearer ');
        
        let plans;
        if (isAdmin) {
            plans = db.prepare('SELECT * FROM membership_plans ORDER BY sort_order ASC').all();
        } else {
            plans = db.prepare('SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY sort_order ASC').all();
        }
        
        // Parse features JSON
        plans = plans.map(plan => ({
            ...plan,
            features: plan.features ? JSON.parse(plan.features) : []
        }));
        
        res.json(plans);
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

/**
 * GET /api/membership/:id
 * Get single plan
 */
router.get('/:id', (req, res) => {
    try {
        const plan = db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        
        plan.features = plan.features ? JSON.parse(plan.features) : [];
        res.json(plan);
    } catch (error) {
        console.error('Get plan error:', error);
        res.status(500).json({ error: 'Failed to fetch plan' });
    }
});

/**
 * POST /api/membership
 * Create new plan
 */
router.post('/', authenticateToken, (req, res) => {
    try {
        const { 
            name, price, billing_period, description, 
            features, is_featured, is_active, sort_order 
        } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const featuresJson = Array.isArray(features) ? JSON.stringify(features) : features || '[]';

        const result = db.prepare(`
            INSERT INTO membership_plans (name, price, billing_period, description, features, is_featured, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            name,
            price,
            billing_period || 'month',
            description || '',
            featuresJson,
            is_featured ? 1 : 0,
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            sort_order || 0
        );

        const plan = db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(result.lastInsertRowid);
        plan.features = JSON.parse(plan.features);

        logActivity(req.user.id, 'create', 'membership_plan', plan.id, `Created plan: ${name}`, req.ip);

        res.status(201).json(plan);
    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({ error: 'Failed to create plan' });
    }
});

/**
 * PUT /api/membership/:id
 * Update plan
 */
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const planId = req.params.id;
        const { 
            name, price, billing_period, description, 
            features, is_featured, is_active, sort_order 
        } = req.body;

        const existing = db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(planId);
        if (!existing) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const featuresJson = features !== undefined 
            ? (Array.isArray(features) ? JSON.stringify(features) : features)
            : existing.features;

        db.prepare(`
            UPDATE membership_plans 
            SET name = ?, price = ?, billing_period = ?, description = ?, 
                features = ?, is_featured = ?, is_active = ?, sort_order = ?
            WHERE id = ?
        `).run(
            name || existing.name,
            price !== undefined ? price : existing.price,
            billing_period || existing.billing_period,
            description !== undefined ? description : existing.description,
            featuresJson,
            is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
            is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
            sort_order !== undefined ? sort_order : existing.sort_order,
            planId
        );

        const plan = db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(planId);
        plan.features = JSON.parse(plan.features);

        logActivity(req.user.id, 'update', 'membership_plan', plan.id, `Updated plan: ${plan.name}`, req.ip);

        res.json(plan);
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

/**
 * DELETE /api/membership/:id
 * Delete plan
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const plan = db.prepare('SELECT * FROM membership_plans WHERE id = ?').get(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        db.prepare('DELETE FROM membership_plans WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'membership_plan', plan.id, `Deleted plan: ${plan.name}`, req.ip);

        res.json({ message: 'Plan deleted successfully' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

/**
 * POST /api/membership/inquiry
 * Submit membership inquiry
 */
router.post('/inquiry', (req, res) => {
    try {
        const { name, email, phone, plan_id, message } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const result = db.prepare(`
            INSERT INTO membership_inquiries (name, email, phone, plan_id, message)
            VALUES (?, ?, ?, ?, ?)
        `).run(name, email, phone || '', plan_id || null, message || '');

        res.status(201).json({ 
            message: 'Inquiry submitted successfully',
            id: result.lastInsertRowid 
        });
    } catch (error) {
        console.error('Submit inquiry error:', error);
        res.status(500).json({ error: 'Failed to submit inquiry' });
    }
});

/**
 * GET /api/membership/inquiries
 * Get all inquiries (admin only)
 */
router.get('/inquiries/all', authenticateToken, (req, res) => {
    try {
        const inquiries = db.prepare(`
            SELECT mi.*, mp.name as plan_name
            FROM membership_inquiries mi
            LEFT JOIN membership_plans mp ON mi.plan_id = mp.id
            ORDER BY mi.created_at DESC
        `).all();
        
        res.json(inquiries);
    } catch (error) {
        console.error('Get inquiries error:', error);
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
});

module.exports = router;
