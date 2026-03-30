const mongoose = require('mongoose');

const sessionBehaviorSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WritingSession',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keystrokes: [
      {
        holdDuration: Number,
        timestamp: Number,
        keyCategory: String,    // "letter", "space", "backspace", "enter", "digit", "other"
      },
    ],
    pasteEvents: [
      {
        timestamp: Number,
        characterCount: Number,
        wordCount: Number,
      },
    ],
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SessionBehavior', sessionBehaviorSchema);