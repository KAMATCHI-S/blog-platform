const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.user_id AS comment_author, p.user_id AS post_author
       FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found.' });
    const { comment_author, post_author } = rows[0];
    if (req.user.id !== comment_author && req.user.id !== post_author) {
      return res.status(403).json({ error: 'You can only delete your own comments.' });
    }
    await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete comment.' });
  }
});

module.exports = router;
