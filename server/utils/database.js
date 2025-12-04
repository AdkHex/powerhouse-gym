/**
 * Database Utility - SQLite with better-sqlite3
 * Handles database initialization and schema creation
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema
 */
async function initDatabase() {
    // Users table
    db.exec(`
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
    db.exec(`
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
    db.exec(`
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `);

    // Trainers table
    db.exec(`
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
    db.exec(`
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trainer_id) REFERENCES trainers(id)
        )
    `);

    // Membership plans table
    db.exec(`
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
    db.exec(`
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

    // Gallery albums table
    db.exec(`
        CREATE TABLE IF NOT EXISTS gallery_albums (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            cover_image TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Gallery images table
    db.exec(`
        CREATE TABLE IF NOT EXISTS gallery_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            album_id INTEGER,
            file_path TEXT NOT NULL,
            thumbnail_path TEXT,
            caption TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE
        )
    `);

    // Media library table
    db.exec(`
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            width INTEGER,
            height INTEGER,
            alt_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Bulletins/Announcements table
    db.exec(`
        CREATE TABLE IF NOT EXISTS bulletins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            priority TEXT DEFAULT 'normal',
            starts_at DATETIME,
            expires_at DATETIME,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Contact submissions table
    db.exec(`
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

    // Membership inquiries table
    db.exec(`
        CREATE TABLE IF NOT EXISTS membership_inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            plan_id INTEGER,
            message TEXT,
            status TEXT DEFAULT 'new',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
        )
    `);

    // Settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            type TEXT DEFAULT 'string'
        )
    `);

    // Activity logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Create default admin user if none exists
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (adminExists.count === 0) {
        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        
        db.prepare(`
            INSERT INTO users (email, password_hash, name, role)
            VALUES (?, ?, ?, ?)
        `).run(
            process.env.ADMIN_EMAIL || 'admin@powerhousegym.com',
            hashedPassword,
            'Admin',
            'super_admin'
        );
        
        console.log('📧 Default admin user created');
    }

    // Create default settings if none exist
    const settingsExist = db.prepare('SELECT COUNT(*) as count FROM settings').get();
    if (settingsExist.count === 0) {
        const defaultSettings = [
            ['site_title', 'PowerHouse Gym Chitwan', 'string'],
            ['site_tagline', 'Transform Your Body, Transform Your Life', 'string'],
            ['site_description', 'Premium fitness center in Chitwan offering world-class equipment and expert trainers.', 'string'],
            ['contact_email', 'info@powerhousegym.com', 'string'],
            ['contact_phone', '+977-9800000000', 'string'],
            ['contact_address', 'Narayangadh, Chitwan, Nepal', 'string'],
            ['social_facebook', 'https://facebook.com/powerhousegymchitwan', 'string'],
            ['social_instagram', 'https://instagram.com/powerhousegymchitwan', 'string'],
            ['social_youtube', '', 'string'],
            ['primary_color', '#ff4d4d', 'string'],
            ['secondary_color', '#1a1a2e', 'string'],
            ['accent_color', '#f9d342', 'string'],
            ['hero_title', 'BUILD YOUR BODY &\nPUSH YOUR LIMITS', 'string'],
            ['hero_subtitle', 'Join the best gym in Chitwan and achieve your fitness goals with expert trainers and premium equipment.', 'string'],
            ['hero_cta_text', 'Start Your Journey', 'string'],
            ['hero_cta_link', '#membership', 'string'],
            ['footer_text', '© 2024 PowerHouse Gym Chitwan. All rights reserved.', 'string'],
            ['opening_hours', 'Mon-Sat: 5:00 AM - 10:00 PM | Sun: 6:00 AM - 8:00 PM', 'string']
        ];

        const insertSetting = db.prepare('INSERT INTO settings (key, value, type) VALUES (?, ?, ?)');
        for (const setting of defaultSettings) {
            insertSetting.run(...setting);
        }
        
        console.log('⚙️ Default settings created');
    }

    // Seed membership plans if none exist
    const plansExist = db.prepare('SELECT COUNT(*) as count FROM membership_plans').get();
    if (plansExist.count === 0) {
        const defaultPlans = [
            ['Basic', 2000, 'month', 'Perfect for beginners', JSON.stringify(['Gym Access', 'Locker Room', 'Basic Equipment']), 0, 1, 1],
            ['Premium', 3500, 'month', 'Most popular choice', JSON.stringify(['Everything in Basic', 'All Equipment Access', 'Group Classes', 'Fitness Assessment']), 1, 1, 2],
            ['Elite', 5000, 'month', 'For serious athletes', JSON.stringify(['Everything in Premium', 'Personal Training (2x/month)', 'Nutrition Consultation', 'Priority Booking', 'Guest Passes']), 0, 1, 3]
        ];

        const insertPlan = db.prepare('INSERT INTO membership_plans (name, price, billing_period, description, features, is_featured, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const plan of defaultPlans) {
            insertPlan.run(...plan);
        }
        
        console.log('💳 Default membership plans created');
    }

    return true;
}

module.exports = { db, initDatabase };
