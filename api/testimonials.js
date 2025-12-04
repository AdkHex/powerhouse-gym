/**
 * Testimonials API
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

    // GET - List approved testimonials (public)
    if (req.method === 'GET') {
        try {
            const result = await db.execute(
                'SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY sort_order'
            );
            return json(res, result.rows);

        } catch (err) {
            console.error('Get testimonials error:', err);
            return error(res, 'Failed to fetch testimonials', 500);
        }
    }

    // POST - Create testimonial (admin only)
    if (req.method === 'POST') {
        const auth = authenticateToken(req);
        if (auth.error) return error(res, auth.error, auth.status);

        const { client_name, client_photo, client_title, content, rating, is_approved } = req.body;

        if (!client_name || !content) {
            return error(res, 'Client name and content required', 400);
        }

        try {
            const result = await db.execute({
                sql: `INSERT INTO testimonials (client_name, client_photo, client_title, content, rating, is_approved)
                      VALUES (?, ?, ?, ?, ?, ?)`,
                args: [client_name, client_photo || '', client_title || '', content, rating || 5, is_approved ? 1 : 0]
            });

            return json(res, { id: Number(result.lastInsertRowid), message: 'Testimonial created' }, 201);

        } catch (err) {
            console.error('Create testimonial error:', err);
            return error(res, 'Failed to create testimonial', 500);
        }
    }

    return error(res, 'Method not allowed', 405);
};
