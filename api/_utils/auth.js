/**
 * Auth Middleware for Vercel Serverless
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'powerhouse-gym-secret-key-change-in-production';

function authenticateToken(req) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return { error: 'Access token required', status: 401 };
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        return { user };
    } catch (error) {
        return { error: 'Invalid or expired token', status: 403 };
    }
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// Helper to send JSON response
function json(res, data, status = 200) {
    res.status(status).json(data);
}

// Helper to send error response
function error(res, message, status = 400) {
    res.status(status).json({ error: message });
}

// CORS headers for API routes
function setCors(res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

module.exports = { authenticateToken, generateToken, json, error, setCors, JWT_SECRET };
