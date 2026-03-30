const express = require('express');
const WritingSession = require('../models/WritingSession');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/sessions — list all sessions for current user
router.get('/', async (req, res) => {
  try {
    const sessions = await WritingSession.find({ userId: req.user._id })
      .select('title wordCount lastSavedAt createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch sessions.' });
  }
});

// POST /api/sessions — create a new session
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;

    const session = await WritingSession.create({
      userId: req.user._id,
      title: title || 'Untitled',
      content: content || '',
    });

    res.status(201).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create session.' });
  }
});

// GET /api/sessions/:id — get a single session
router.get('/:id', async (req, res) => {
  try {
    const session = await WritingSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch session.' });
  }
});

// PATCH /api/sessions/:id — update title or content
router.patch('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;

    const session = await WritingSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (title !== undefined) session.title = title;
    if (content !== undefined) session.content = content;

    await session.save();

    res.status(200).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update session.' });
  }
});

// DELETE /api/sessions/:id — delete a session
router.delete('/:id', async (req, res) => {
  try {
    const session = await WritingSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.status(200).json({ success: true, message: 'Session deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete session.' });
  }
});

module.exports = router;
