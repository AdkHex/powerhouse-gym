/**
 * Trainers API
 * Vercel Serverless Function
 */

const { db, initDatabase } = require('./_utils/database');
const { authenticateToken, json, error, setCors } = require('./_utils/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    await initDatabase();

    // GET - List all trainers (public)
    if (req.method === 'GET') {
        try {
            const result = await db.execute(
                'SELECT * FROM trainers WHERE is_active = 1 ORDER BY sort_order'
            );
            return json(res, result.rows);

        } catch (err) {
            console.error('Get trainers error:', err);
            return error(res, 'Failed to fetch trainers', 500);
        }
    }

    // POST - Create trainer (admin only)
    if (req.method === 'POST') {
        const auth = authenticateToken(req);
        if (auth.error) return error(res, auth.error, auth.status);

        const { name, specialty, bio, photo, email, is_active } = req.body;

        if (!name) {
            return error(res, 'Name is required', 400);
        }

        try {
            const result = await db.execute({
                sql: `INSERT INTO trainers (name, specialty, bio, photo, email, is_active)
                      VALUES (?, ?, ?, ?, ?, ?)`,
                args: [name, specialty || '', bio || '', photo || '', email || '', is_active !== false ? 1 : 0]
            });

            return json(res, { id: Number(result.lastInsertRowid), message: 'Trainer created' }, 201);

        } catch (err) {
            console.error('Create trainer error:', err);
            return error(res, 'Failed to create trainer', 500);
        }
    }

    return error(res, 'Method not allowed', 405);
};
