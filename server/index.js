/**
 * PowerHouse Gym Chitwan - Main Server
 * Express.js server with API routes and static file serving
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const pagesRoutes = require('./routes/pages');
const mediaRoutes = require('./routes/media');
const blogRoutes = require('./routes/blog');
const galleryRoutes = require('./routes/gallery');
const trainersRoutes = require('./routes/trainers');
const classesRoutes = require('./routes/classes');
const membershipRoutes = require('./routes/membership');
const testimonialsRoutes = require('./routes/testimonials');
const settingsRoutes = require('./routes/settings');
const contactRoutes = require('./routes/contact');

// Import database initialization
const { initDatabase } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.SITE_URL || 'http://localhost:3000',
    credentials: true
}));

// Compression
app.use(compression());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// Admin static files
app.use('/admin', express.static(path.join(__dirname, '../admin'), {
    maxAge: 0 // No caching for admin
}));

// Uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pages', pagesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/testimonials', testimonialsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact', contactRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
    });
});

// Admin SPA fallback
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});

// Frontend SPA fallback (if needed for dynamic routes)
app.get('*', (req, res) => {
    // Check if it's an HTML page request
    if (req.accepts('html')) {
        const requestedPage = path.join(__dirname, '../public', req.path);
        const htmlPath = requestedPage.endsWith('.html') ? requestedPage : `${requestedPage}.html`;
        
        res.sendFile(htmlPath, (err) => {
            if (err) {
                res.sendFile(path.join(__dirname, '../public/index.html'));
            }
        });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'An error occurred' 
            : err.message
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await initDatabase();
        console.log('✅ Database initialized');
        
        app.listen(PORT, () => {
            console.log(`
🏋️ PowerHouse Gym Chitwan Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server running at: http://localhost:${PORT}
🔧 Environment: ${process.env.NODE_ENV || 'development'}
📊 Admin panel: http://localhost:${PORT}/admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
