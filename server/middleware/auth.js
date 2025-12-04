/**
 * Authentication Middleware
 * JWT-based authentication for protected routes
 */

const jwt = require('jsonwebtoken');
const { db } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token and attach user to request
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Get user from database
        const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(403).json({ error: 'Invalid token' });
    }
}

/**
 * Check if user has required role
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

/**
 * Optional authentication - doesn't fail if no token
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.userId);
        req.user = user || null;
    } catch (error) {
        req.user = null;
    }

    next();
}

/**
 * Log activity to database
 */
function logActivity(userId, action, entityType = null, entityId = null, details = null, ipAddress = null) {
    try {
        db.prepare(`
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, action, entityType, entityId, details, ipAddress);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth,
    logActivity,
    JWT_SECRET
};
