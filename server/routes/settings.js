/**
 * Settings Routes
 * Site settings and configuration management
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/settings
 * Get all settings (public settings or all for admin)
 */
router.get('/', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all();
        
        // Convert to object format
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });
        
        res.json(settingsObj);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * GET /api/settings/:key
 * Get single setting
 */
router.get('/:key', (req, res) => {
    try {
        const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
        
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        
        res.json({ key: setting.key, value: setting.value });
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

/**
 * PUT /api/settings
 * Update multiple settings
 */
router.put('/', authenticateToken, (req, res) => {
    try {
        const updates = req.body;

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'Settings object required' });
        }

        const updateStmt = db.prepare(`
            INSERT INTO settings (key, value, type) VALUES (?, ?, 'string')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);

        const updateMany = db.transaction((settings) => {
            for (const [key, value] of Object.entries(settings)) {
                updateStmt.run(key, String(value));
            }
        });

        updateMany(updates);

        logActivity(req.user.id, 'update', 'settings', null, `Updated ${Object.keys(updates).length} settings`, req.ip);

        // Return updated settings
        const settings = db.prepare('SELECT * FROM settings').all();
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * PUT /api/settings/:key
 * Update single setting
 */
router.put('/:key', authenticateToken, (req, res) => {
    try {
        const { value } = req.body;
        const key = req.params.key;

        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }

        db.prepare(`
            INSERT INTO settings (key, value, type) VALUES (?, ?, 'string')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(key, String(value));

        logActivity(req.user.id, 'update', 'settings', null, `Updated setting: ${key}`, req.ip);

        res.json({ key, value: String(value) });
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

/**
 * GET /api/settings/activity/logs
 * Get activity logs (admin only)
 */
router.get('/activity/logs', authenticateToken, (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const logs = db.prepare(`
            SELECT al.*, u.name as user_name, u.email as user_email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `).all(parseInt(limit), parseInt(offset));
        
        res.json(logs);
    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

/**
 * GET /api/settings/bulletins
 * Get active bulletins
 */
router.get('/bulletins/active', (req, res) => {
    try {
        const bulletins = db.prepare(`
            SELECT * FROM bulletins 
            WHERE is_active = 1 
            AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ORDER BY priority DESC, created_at DESC
        `).all();
        
        res.json(bulletins);
    } catch (error) {
        console.error('Get bulletins error:', error);
        res.status(500).json({ error: 'Failed to fetch bulletins' });
    }
});

module.exports = router;
