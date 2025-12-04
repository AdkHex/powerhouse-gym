/**
 * Blog Routes
 * CRUD operations for blog posts
 */

const express = require('express');
const { db } = require('../utils/database');
const { authenticateToken, optionalAuth, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/blog
 * Get all posts (public gets only published, admin gets all)
 */
router.get('/', optionalAuth, (req, res) => {
    try {
        const { category, limit, offset } = req.query;
        
        let query = 'SELECT * FROM blog_posts';
        let countQuery = 'SELECT COUNT(*) as total FROM blog_posts';
        const params = [];
        const conditions = [];

        // Public only sees published posts
        if (!req.user) {
            conditions.push("status = 'published'");
            conditions.push('publish_date <= CURRENT_TIMESTAMP');
        }

        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY publish_date DESC, created_at DESC';

        // Get total count
        const totalResult = db.prepare(countQuery).get(...params);

        // Pagination
        if (limit) {
            query += ` LIMIT ${parseInt(limit)}`;
            if (offset) {
                query += ` OFFSET ${parseInt(offset)}`;
            }
        }

        const posts = db.prepare(query).all(...params);

        res.json({
            posts,
            total: totalResult.total,
            limit: parseInt(limit) || null,
            offset: parseInt(offset) || 0
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

/**
 * GET /api/blog/categories
 * Get all categories
 */
router.get('/categories', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT DISTINCT category FROM blog_posts 
            WHERE category IS NOT NULL AND category != '' AND status = 'published'
            ORDER BY category
        `).all();
        
        res.json(categories.map(c => c.category));
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

/**
 * GET /api/blog/:slug
 * Get single post by slug
 */
router.get('/:slug', optionalAuth, (req, res) => {
    try {
        const post = db.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(req.params.slug);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Public only sees published
        if (!req.user && (post.status !== 'published' || new Date(post.publish_date) > new Date())) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json(post);
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

/**
 * POST /api/blog
 * Create new post
 */
router.post('/', authenticateToken, (req, res) => {
    try {
        const { 
            title, slug, excerpt, content, featured_image, 
            category, tags, status, publish_date 
        } = req.body;

        if (!title || !slug) {
            return res.status(400).json({ error: 'Title and slug are required' });
        }

        // Check if slug exists
        const existing = db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(slug);
        if (existing) {
            return res.status(400).json({ error: 'Slug already exists' });
        }

        const result = db.prepare(`
            INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, tags, status, publish_date, author_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            title, 
            slug, 
            excerpt || '', 
            content || '', 
            featured_image || '', 
            category || '', 
            tags || '', 
            status || 'draft', 
            publish_date || new Date().toISOString(),
            req.user.id
        );

        const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(result.lastInsertRowid);

        logActivity(req.user.id, 'create', 'blog_post', post.id, `Created post: ${title}`, req.ip);

        res.status(201).json(post);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

/**
 * PUT /api/blog/:id
 * Update post
 */
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const postId = req.params.id;
        const { 
            title, slug, excerpt, content, featured_image, 
            category, tags, status, publish_date 
        } = req.body;

        const existing = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(postId);
        if (!existing) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check slug conflict
        if (slug && slug !== existing.slug) {
            const slugExists = db.prepare('SELECT id FROM blog_posts WHERE slug = ? AND id != ?').get(slug, postId);
            if (slugExists) {
                return res.status(400).json({ error: 'Slug already exists' });
            }
        }

        db.prepare(`
            UPDATE blog_posts 
            SET title = ?, slug = ?, excerpt = ?, content = ?, featured_image = ?,
                category = ?, tags = ?, status = ?, publish_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            title || existing.title,
            slug || existing.slug,
            excerpt !== undefined ? excerpt : existing.excerpt,
            content !== undefined ? content : existing.content,
            featured_image !== undefined ? featured_image : existing.featured_image,
            category !== undefined ? category : existing.category,
            tags !== undefined ? tags : existing.tags,
            status || existing.status,
            publish_date || existing.publish_date,
            postId
        );

        const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(postId);

        logActivity(req.user.id, 'update', 'blog_post', post.id, `Updated post: ${post.title}`, req.ip);

        res.json(post);
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

/**
 * DELETE /api/blog/:id
 * Delete post
 */
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const post = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);

        logActivity(req.user.id, 'delete', 'blog_post', post.id, `Deleted post: ${post.title}`, req.ip);

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

module.exports = router;
