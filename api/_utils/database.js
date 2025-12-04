/**
 * Database Utility for Vercel - Using Turso (LibSQL)
 * Free SQLite-compatible cloud database
 */

const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');

// Create Turso client
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN
});

/**
 * Initialize database schema
 */
async function initDatabase() {
    // Users table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // Pages table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            content TEXT,
            meta_title TEXT,
            meta_description TEXT,
            meta_keywords TEXT,
            is_published INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Blog posts table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            excerpt TEXT,
            content TEXT,
            featured_image TEXT,
            category TEXT,
            tags TEXT,
            status TEXT DEFAULT 'draft',
            publish_date DATETIME,
            author_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Trainers table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS trainers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialty TEXT,
            bio TEXT,
            photo TEXT,
            email TEXT,
            phone TEXT,
            social_facebook TEXT,
            social_instagram TEXT,
            social_twitter TEXT,
            certifications TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Classes table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            short_description TEXT,
            image TEXT,
            trainer_id INTEGER,
            schedule TEXT,
            duration INTEGER,
            capacity INTEGER,
            price REAL,
            difficulty TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Membership plans table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS membership_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            billing_period TEXT DEFAULT 'month',
            description TEXT,
            features TEXT,
            is_featured INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Testimonials table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS testimonials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            client_photo TEXT,
            client_title TEXT,
            content TEXT NOT NULL,
            rating INTEGER DEFAULT 5,
            is_approved INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Contact submissions table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            subject TEXT,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Settings table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            type TEXT DEFAULT 'string'
        )
    `);

    // Seed default data
    await seedDefaultData();

    return true;
}

async function seedDefaultData() {
    // Check if admin exists
    const adminCheck = await db.execute('SELECT COUNT(*) as count FROM users');
    if (adminCheck.rows[0].count === 0) {
        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        
        await db.execute({
            sql: 'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
            args: [
                process.env.ADMIN_EMAIL || 'admin@powerhousegym.com',
                hashedPassword,
                'Admin',
                'super_admin'
            ]
        });
    }

    // Check if settings exist
    const settingsCheck = await db.execute('SELECT COUNT(*) as count FROM settings');
    if (settingsCheck.rows[0].count === 0) {
        const defaultSettings = [
            ['site_title', 'PowerHouse Gym Chitwan'],
            ['site_tagline', 'Transform Your Body, Transform Your Life'],
            ['contact_email', 'info@powerhousegym.com'],
            ['contact_phone', '+977-9800000000'],
            ['contact_address', 'Narayangadh, Chitwan, Nepal'],
            ['primary_color', '#ff4d4d'],
            ['hero_title', 'BUILD YOUR BODY & PUSH YOUR LIMITS']
        ];

        for (const [key, value] of defaultSettings) {
            await db.execute({
                sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
                args: [key, value]
            });
        }
    }

    // Check if membership plans exist
    const plansCheck = await db.execute('SELECT COUNT(*) as count FROM membership_plans');
    if (plansCheck.rows[0].count === 0) {
        const plans = [
            ['Basic', 2000, 'month', 'Perfect for beginners', JSON.stringify(['Gym Access', 'Locker Room', 'Basic Equipment']), 0],
            ['Premium', 3500, 'month', 'Most popular choice', JSON.stringify(['All Equipment', 'Group Classes', 'Fitness Assessment']), 1],
            ['Elite', 5000, 'month', 'For serious athletes', JSON.stringify(['Everything in Premium', 'Personal Training', 'Nutrition Plan']), 0]
        ];

        for (const plan of plans) {
            await db.execute({
                sql: 'INSERT INTO membership_plans (name, price, billing_period, description, features, is_featured) VALUES (?, ?, ?, ?, ?, ?)',
                args: plan
            });
        }
    }
}

module.exports = { db, initDatabase };
