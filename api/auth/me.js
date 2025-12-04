/**
 * Auth Me API - Get current user
 * Vercel Serverless Function
 */

const { db, initDatabase } = require('../_utils/database');
const { authenticateToken, json, error, setCors } = require('../_utils/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    await initDatabase();

    if (req.method === 'GET') {
        const auth = authenticateToken(req);
        
        if (auth.error) {
            return error(res, auth.error, auth.status);
        }

        try {
            const result = await db.execute({
                sql: 'SELECT id, email, name, role, created_at, last_login FROM users WHERE id = ?',
                args: [auth.user.id]
            });

            const user = result.rows[0];

            if (!user) {
                return error(res, 'User not found', 404);
            }

            return json(res, user);

        } catch (err) {
            console.error('Get user error:', err);
            return error(res, 'Failed to get user', 500);
        }
    }

    return error(res, 'Method not allowed', 405);
};
