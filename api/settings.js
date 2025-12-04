/**
 * Settings API
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

    // GET - Get all settings (public for frontend)
    if (req.method === 'GET') {
        try {
            const result = await db.execute('SELECT key, value FROM settings');
            
            const settings = {};
            result.rows.forEach(row => {
                settings[row.key] = row.value;
            });

            return json(res, settings);

        } catch (err) {
            console.error('Get settings error:', err);
            return error(res, 'Failed to fetch settings', 500);
        }
    }

    // PUT - Update settings (admin only)
    if (req.method === 'PUT') {
        const auth = authenticateToken(req);
        if (auth.error) return error(res, auth.error, auth.status);

        const updates = req.body;

        try {
            for (const [key, value] of Object.entries(updates)) {
                await db.execute({
                    sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    args: [key, value]
                });
            }

            return json(res, { message: 'Settings updated' });

        } catch (err) {
            console.error('Update settings error:', err);
            return error(res, 'Failed to update settings', 500);
        }
    }

    return error(res, 'Method not allowed', 405);
};
