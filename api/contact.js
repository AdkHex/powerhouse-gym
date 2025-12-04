/**
 * Contact Form API
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

    // POST - Submit contact form (public)
    if (req.method === 'POST') {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !message) {
            return error(res, 'Name, email, and message are required', 400);
        }

        try {
            await db.execute({
                sql: `INSERT INTO contact_submissions (name, email, phone, subject, message)
                      VALUES (?, ?, ?, ?, ?)`,
                args: [name, email, phone || '', subject || '', message]
            });

            return json(res, { message: 'Message sent successfully' }, 201);

        } catch (err) {
            console.error('Contact submission error:', err);
            return error(res, 'Failed to submit message', 500);
        }
    }

    // GET - List submissions (admin only)
    if (req.method === 'GET') {
        const auth = authenticateToken(req);
        if (auth.error) return error(res, auth.error, auth.status);

        try {
            const result = await db.execute(
                'SELECT * FROM contact_submissions ORDER BY created_at DESC'
            );
            
            const unreadResult = await db.execute(
                'SELECT COUNT(*) as count FROM contact_submissions WHERE is_read = 0'
            );

            return json(res, {
                submissions: result.rows,
                unread: unreadResult.rows[0].count
            });

        } catch (err) {
            console.error('Get submissions error:', err);
            return error(res, 'Failed to fetch submissions', 500);
        }
    }

    return error(res, 'Method not allowed', 405);
};
