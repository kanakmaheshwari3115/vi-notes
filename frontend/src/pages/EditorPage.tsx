import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WritingSession } from '../types';
import { api } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import './EditorPage.css';

const AUTOSAVE_DELAY = 1500;
const BEHAVIOR_FLUSH_INTERVAL = 30000;

interface KeystrokeRecord {
  holdDuration: number;
  timestamp: number;
  keyCategory: string;
}

interface PasteRecord {
  timestamp: number;
  characterCount: number;
  wordCount: number;
}

interface PasteStats {
  totalPastes: number;
  totalWordsPasted: number;
  totalCharsPasted: number;
  lastPasteAt: Date | null;
}

const getKeyCategory = (code: string): string => {
  if (code === 'Space') return 'space';
  if (code === 'Backspace') return 'backspace';
  if (code === 'Enter') return 'enter';
  if (code.startsWith('Key')) return 'letter';
  if (code.startsWith('Digit')) return 'digit';
  if (code.startsWith('Arrow')) return 'arrow';
  return 'other';
};

const EditorPage: React.FC = () => {
  const { user, logout } = useAuth();

  const [sessions, setSessions] = useState<WritingSession[]>([]);
  const [activeSession, setActiveSession] = useState<WritingSession | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState('');
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('autosaveEnabled');
    return saved === null ? true : saved === 'true';
  });
  // Paste stats shown in the UI
  const [pasteStats, setPasteStats] = useState<PasteStats>({
    totalPastes: 0,
    totalWordsPasted: 0,
    totalCharsPasted: 0,
    lastPasteAt: null,
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const keystrokeBuffer = useRef<KeystrokeRecord[]>([]);
  const pasteBuffer = useRef<PasteRecord[]>([]);
  const keyDownTimes = useRef<Record<string, number>>({});

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openSession = async (sessionId: string) => {
    await flushBehaviorBuffer();
    setLoadingSession(true);

    // Reset paste stats when switching sessions
    setPasteStats({
      totalPastes: 0,
      totalWordsPasted: 0,
      totalCharsPasted: 0,
      lastPasteAt: null,
    });

    try {
      const data = await api.getSession(sessionId);
      setActiveSession(data.session);
      setContent(data.session.content);
      setTitle(data.session.title);
      setSaveStatus('saved');
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSession(false);
    }
  };

  const createSession = async () => {
    try {
      const data = await api.createSession('Untitled');
      setSessions(prev => [data.session, ...prev]);
      await openSession(data.session._id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.deleteSession(id);
      setSessions(prev => prev.filter(s => s._id !== id));
      if (activeSession?._id === id) {
        setActiveSession(null);
        setContent('');
        setTitle('');
        setPasteStats({ totalPastes: 0, totalWordsPasted: 0, totalCharsPasted: 0, lastPasteAt: null });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const scheduleSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!activeSession) return;
      if (!autosaveEnabled) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        return;
      }
      setSaveStatus('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await api.updateSession(activeSession._id, { title: newTitle, content: newContent });
          setSaveStatus('saved');
          setSessions(prev =>
            prev.map(s =>
              s._id === activeSession._id
                ? { ...s, title: newTitle, wordCount: newContent.trim().split(/\s+/).filter(Boolean).length }
                : s
            )
          );
        } catch {
          setSaveStatus('unsaved');
        }
      }, AUTOSAVE_DELAY);
    },
    [activeSession]
  );

  const flushBehaviorBuffer = useCallback(async () => {
    if (!activeSession) return;
    const ks = [...keystrokeBuffer.current];
    const pe = [...pasteBuffer.current];
    if (ks.length === 0 && pe.length === 0) return;
    keystrokeBuffer.current = [];
    pasteBuffer.current = [];
    try {
      await api.saveBehavior(activeSession._id, { keystrokes: ks, pasteEvents: pe });
    } catch {
      // silently fail
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(flushBehaviorBuffer, BEHAVIOR_FLUSH_INTERVAL);
    return () => clearInterval(interval);
  }, [activeSession, flushBehaviorBuffer]);

  useEffect(() => {
    const handleUnload = () => flushBehaviorBuffer();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [flushBehaviorBuffer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    keyDownTimes.current[e.code] = Date.now();
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const pressTime = keyDownTimes.current[e.code];
    if (!pressTime) return;
    keystrokeBuffer.current.push({
      holdDuration: Date.now() - pressTime,
      timestamp: Date.now(),
      keyCategory: getKeyCategory(e.code),
    });
    delete keyDownTimes.current[e.code];
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const chars = pastedText.length;
    const words = pastedText.trim().split(/\s+/).filter(Boolean).length;
    const now = new Date();

    // Update live paste stats shown in the UI
    setPasteStats(prev => ({
      totalPastes: prev.totalPastes + 1,
      totalWordsPasted: prev.totalWordsPasted + words,
      totalCharsPasted: prev.totalCharsPasted + chars,
      lastPasteAt: now,
    }));

    // Also buffer for backend
    pasteBuffer.current.push({
      timestamp: now.getTime(),
      characterCount: chars,
      wordCount: words,
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    scheduleSave(title, val);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    scheduleSave(val, content);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = content.length;

  // What % of total words were pasted
  const pastePercentage =
    wordCount > 0 ? Math.min(100, Math.round((pasteStats.totalWordsPasted / wordCount) * 100)) : 0;

  return (
    <div className="editor-layout">
      {/* Sidebar */}
      <aside className={`editor-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-icon">⌨</span>
            {sidebarOpen && <span className="brand-name">Vi-Notes</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <div className="sidebar-new-btn-wrap">
              <button className="sidebar-new-btn" onClick={createSession}>
                <span>+</span> New Session
              </button>
            </div>

            <div className="sidebar-sessions">
              {sessions.length === 0 ? (
                <p className="sidebar-empty">No sessions yet. Create one to start writing.</p>
              ) : (
                sessions.map(s => (
                  <div
                    key={s._id}
                    className={`session-item ${activeSession?._id === s._id ? 'active' : ''}`}
                    onClick={() => openSession(s._id)}
                  >
                    <div className="session-item-title">{s.title || 'Untitled'}</div>
                    <div className="session-item-meta">
                      {s.wordCount} words · {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                    <button
                      className="session-delete-btn"
                      onClick={e => deleteSession(s._id, e)}
                      title="Delete session"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="sidebar-user">
              <div className="sidebar-user-email">{user?.email}</div>
              <button className="sidebar-logout-btn" onClick={logout}>Sign out</button>
            </div>
          </>
        )}
      </aside>

      {/* Main editor area */}
      <main className="editor-main">
        {error && (
          <div className="editor-error" onClick={() => setError('')}>
            {error} <span>(click to dismiss)</span>
          </div>
        )}

        {!activeSession ? (
          <div className="editor-empty-state">
            <div className="empty-state-icon">✍</div>
            <h2 className="empty-state-heading">No session open</h2>
            <p className="empty-state-text">Select a session from the sidebar or create a new one.</p>
            <button className="empty-state-btn" onClick={createSession}>+ New Session</button>
          </div>
        ) : loadingSession ? (
          <div className="editor-loading">
            <div className="loading-ring" />
          </div>
        ) : (
          <div className="editor-content">
            {/* Title bar */}
            <div className="editor-titlebar">
              <input
                type="text"
                className="editor-title-input"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled"
                maxLength={200}
              />
              <div className="editor-status">
                {autosaveEnabled && (
                  <>
                    <span
                      className={`save-dot ${saveStatus}`}
                      title={
                        saveStatus === 'saved' ? 'All changes saved'
                        : saveStatus === 'saving' ? 'Saving…'
                        : 'Unsaved changes'
                      }
                    />
                    <span className="save-label">
                      {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
                    </span>
                  </>
                )}
                <button
                  className={`autosave-toggle ${autosaveEnabled ? 'on' : 'off'}`}
                  onClick={() => setAutosaveEnabled(prev => {
                    const next = !prev;
                    localStorage.setItem('autosaveEnabled', String(next));
                    return next;
                  })}
                  title={autosaveEnabled ? 'Autosave is ON — click to turn off' : 'Autosave is OFF — click to turn on'}
                >
                  {autosaveEnabled ? '⏳ Autosave ON' : '🚫 Autosave OFF'}
                </button>
              </div>
            </div>

            {/* Paste stats panel — only shown if user has pasted at least once */}
            {pasteStats.totalPastes > 0 && (
              <div className="paste-stats-bar">
                <span className="paste-stats-label">📋 Paste activity</span>
                <div className="paste-stats-items">
                  <div className="paste-stat">
                    <span className="paste-stat-value">{pasteStats.totalPastes}</span>
                    <span className="paste-stat-key">pastes</span>
                  </div>
                  <div className="paste-stat-sep" />
                  <div className="paste-stat">
                    <span className="paste-stat-value">{pasteStats.totalWordsPasted.toLocaleString()}</span>
                    <span className="paste-stat-key">words pasted</span>
                  </div>
                  <div className="paste-stat-sep" />
                  <div className="paste-stat">
                    <span className="paste-stat-value">{pasteStats.totalCharsPasted.toLocaleString()}</span>
                    <span className="paste-stat-key">chars pasted</span>
                  </div>
                  <div className="paste-stat-sep" />
                  <div className="paste-stat">
                    <span className="paste-stat-value paste-stat-value--accent">{pastePercentage}%</span>
                    <span className="paste-stat-key">of content pasted</span>
                  </div>
                  {pasteStats.lastPasteAt && (
                    <>
                      <div className="paste-stat-sep" />
                      <div className="paste-stat">
                        <span className="paste-stat-key">last paste at </span>
                        <span className="paste-stat-value">
                          {pasteStats.lastPasteAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Writing textarea */}
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onPaste={handlePaste}
              placeholder="Start writing…"
              spellCheck
              autoCorrect="on"
            />

            {/* Status bar */}
            <div className="editor-statusbar">
              <span>{wordCount.toLocaleString()} words</span>
              <span className="statusbar-sep">·</span>
              <span>{charCount.toLocaleString()} chars</span>
              {pasteStats.totalPastes > 0 && (
                <>
                  <span className="statusbar-sep">·</span>
                  <span className="statusbar-paste">
                    {pasteStats.totalPastes} paste{pasteStats.totalPastes > 1 ? 's' : ''} detected
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EditorPage;