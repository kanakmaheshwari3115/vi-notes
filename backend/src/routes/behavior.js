const express = require('express');
const router = express.Router();
const SessionBehavior = require('../models/SessionBehavior');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// POST /api/behavior/:sessionId
// Called every 30s from the frontend to flush keystroke + paste buffers
router.post('/:sessionId', async (req, res) => {
  try {
    const { keystrokes, pasteEvents } = req.body;

    if (
      (!keystrokes || keystrokes.length === 0) &&
      (!pasteEvents || pasteEvents.length === 0)
    ) {
      return res.status(200).json({ success: true, message: 'Nothing to save.' });
    }

    await SessionBehavior.create({
      sessionId: req.params.sessionId,
      userId: req.user._id,
      keystrokes: keystrokes || [],
      pasteEvents: pasteEvents || [],
    });

    res.status(201).json({ success: true, message: 'Behavior data saved.' });
  } catch (error) {
    console.error('Behavior save error:', error);
    res.status(500).json({ success: false, message: 'Failed to save behavior data.' });
  }
});

// GET /api/behavior/:sessionId
// Retrieve all behavior chunks for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const records = await SessionBehavior.find({
      sessionId: req.params.sessionId,
      userId: req.user._id,
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch behavior data.' });
  }
});

module.exports = router;