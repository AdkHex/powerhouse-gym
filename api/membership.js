/**
 * Membership Plans API
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

    // GET - List all plans (public)
    if (req.method === 'GET') {
        try {
            const result = await db.execute(
                'SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY sort_order'
            );
            
            const plans = result.rows.map(plan => ({
                ...plan,
                features: plan.features ? JSON.parse(plan.features) : []
            }));

            return json(res, plans);

        } catch (err) {
            console.error('Get plans error:', err);
            return error(res, 'Failed to fetch plans', 500);
        }
    }

    // POST - Create plan (admin only)
    if (req.method === 'POST') {
        const auth = authenticateToken(req);
        if (auth.error) return error(res, auth.error, auth.status);

        const { name, price, billing_period, description, features, is_featured } = req.body;

        if (!name || price === undefined) {
            return error(res, 'Name and price required', 400);
        }

        try {
            const result = await db.execute({
                sql: `INSERT INTO membership_plans (name, price, billing_period, description, features, is_featured)
                      VALUES (?, ?, ?, ?, ?, ?)`,
                args: [
                    name,
                    price,
                    billing_period || 'month',
                    description || '',
                    JSON.stringify(features || []),
                    is_featured ? 1 : 0
                ]
            });

            return json(res, { id: Number(result.lastInsertRowid), message: 'Plan created' }, 201);

        } catch (err) {
            console.error('Create plan error:', err);
            return error(res, 'Failed to create plan', 500);
        }
    }

    return error(res, 'Method not allowed', 405);
};
