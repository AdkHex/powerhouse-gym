/**
 * Auth API - Login/Logout
 * Vercel Serverless Function
 */

const bcrypt = require('bcrypt');
const { db, initDatabase } = require('./_utils/database');
const { generateToken, json, error, setCors } = require('./_utils/auth');

module.exports = async function handler(req, res) {
    setCors(res);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Initialize database on first request
    await initDatabase();

    if (req.method === 'POST') {
        const { email, password } = req.body;

        if (!email || !password) {
            return error(res, 'Email and password required', 400);
        }

        try {
            const result = await db.execute({
                sql: 'SELECT * FROM users WHERE email = ?',
                args: [email]
            });

            const user = result.rows[0];

            if (!user) {
                return error(res, 'Invalid credentials', 401);
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (!validPassword) {
                return error(res, 'Invalid credentials', 401);
            }

            // Update last login
            await db.execute({
                sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                args: [user.id]
            });

            const token = generateToken(user);

            return json(res, {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });

        } catch (err) {
            console.error('Login error:', err);
            return error(res, 'Login failed', 500);
        }
    }

    return error(res, 'Method not allowed', 405);
};
