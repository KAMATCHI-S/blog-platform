const express = require('express');
const pool = require('../config/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public: list posts (optional ?search=), with author + comment count
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT p.id, p.title, p.content, p.created_at, p.updated_at,
             u.id AS author_id, u.username AS author,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (search) { sql += ' AND (p.title LIKE ? OR p.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load posts.' });
  }
});

// Public: single post with its comments
router.get('/:id', async (req, res) => {
  try {
    const [posts] = await pool.query(
      `SELECT p.*, u.username AS author FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (posts.length === 0) return res.status(404).json({ error: 'Post not found.' });
    const [comments] = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ ...posts[0], comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load post.' });
  }
});

// Create a post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
      [req.user.id, title.trim(), content.trim()]
    );
    const [rows] = await pool.query(
      `SELECT p.*, u.username AS author FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create post.' });
  }
});

// Edit a post — author only
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Post not found.' });
    if (existing[0].user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own posts.' });

    const { title, content } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }
    await pool.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title.trim(), content.trim(), req.params.id]);
    const [rows] = await pool.query(
      `SELECT p.*, u.username AS author FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update post.' });
  }
});

// Delete a post — author only
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Post not found.' });
    if (existing[0].user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own posts.' });
    await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete post.' });
  }
});

// Comments on a post
router.get('/:id/comments', async (req, res) => {
  try {
    const [comments] = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    const [post] = await pool.query('SELECT id FROM posts WHERE id = ?', [req.params.id]);
    if (post.length === 0) return res.status(404).json({ error: 'Post not found.' });
    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, content.trim()]
    );
    res.status(201).json({
      id: result.insertId,
      content: content.trim(),
      user_id: req.user.id,
      username: req.user.username,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add comment.' });
  }
});

module.exports = router;
