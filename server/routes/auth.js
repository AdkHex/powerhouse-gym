/**
 * Authentication Routes
 * Login, logout, and session management
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../utils/database');
const { authenticateToken, logActivity, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        logActivity(user.id, 'login', 'user', user.id, null, req.ip);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 * Invalidate session (client should remove token)
 */
router.post('/logout', authenticateToken, (req, res) => {
    logActivity(req.user.id, 'logout', 'user', req.user.id, null, req.ip);
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Get user with password
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, req.user.id);

        logActivity(req.user.id, 'password_change', 'user', req.user.id, null, req.ip);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
