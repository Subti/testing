import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from './firebase';
import './App.css';

// Simple hash function for passphrase
const hashPassphrase = (passphrase) => {
  let hash = 0;
  for (let i = 0; i < passphrase.length; i++) {
    const char = passphrase.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [roomId, setRoomId] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [lastSync, setLastSync] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const textareaRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const debounceTimeout = useRef(null);
  const lastSyncedText = useRef('');

  // Handle authentication
  const handleAuth = (e) => {
    e.preventDefault();
    if (passphrase.trim().length < 4) {
      setError('Passphrase must be at least 4 characters');
      return;
    }
    const room = hashPassphrase(passphrase);
    setRoomId(room);
    setAuthenticated(true);
    setError('');
  };

  // Sync to Firebase
  const syncToFirebase = useCallback((textToSync) => {
    if (!authenticated || !roomId) return;

    const textRef = ref(database, `rooms/${roomId}/content`);
    setSyncStatus('syncing');

    set(textRef, textToSync)
      .then(() => {
        setSyncStatus('synced');
        setLastSync(new Date());
        setHasUnsavedChanges(false);
        lastSyncedText.current = textToSync;
      })
      .catch((error) => {
        console.error('Error updating:', error);
        setSyncStatus('error');
      });
  }, [authenticated, roomId]);

  // Set up Firebase listener when authenticated
  useEffect(() => {
    if (!authenticated || !roomId) return;

    const textRef = ref(database, `rooms/${roomId}/content`);

    // Listen for changes
    const unsubscribe = onValue(textRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null) {
        isRemoteUpdate.current = true;
        setText(data);
        lastSyncedText.current = data;
        setSyncStatus('synced');
        setLastSync(new Date());
        setHasUnsavedChanges(false);
      } else {
        // Initialize with empty content
        set(textRef, '');
      }
    }, (error) => {
      console.error('Firebase error:', error);
      setSyncStatus('error');
      setError('Connection error. Check Firebase config.');
    });

    return () => unsubscribe();
  }, [authenticated, roomId]);

  // Handle text changes with debouncing
  const handleTextChange = (e) => {
    const newText = e.target.value;

    // Skip if this is a remote update
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    // Update local state immediately (instant typing)
    setText(newText);

    // Mark as having unsaved changes
    if (newText !== lastSyncedText.current) {
      setHasUnsavedChanges(true);
      setSyncStatus('pending');
    }

    // Clear previous debounce timer
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new debounce timer (sync after 1 second of no typing)
    debounceTimeout.current = setTimeout(() => {
      syncToFirebase(newText);
    }, 1000);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Ctrl+S or Cmd+S to manually sync
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (hasUnsavedChanges) {
        // Clear debounce timer
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        syncToFirebase(text);
      }
    }
  };

  // Format last sync time
  const formatSyncTime = () => {
    if (!lastSync) return '';
    const now = new Date();
    const diff = Math.floor((now - lastSync) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // Auto-focus textarea when authenticated
  useEffect(() => {
    if (authenticated && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [authenticated]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  if (!authenticated) {
    return (
      <div className="auth-container">
        <div className="auth-prompt">&gt;_</div>
        <form onSubmit={handleAuth} className="auth-form">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="access key"
            autoFocus
          />
          <button type="submit">enter</button>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="editor-container">
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder=""
        spellCheck={false}
      />
      <div className="status-bar">
        <span>
          {syncStatus === 'synced' && `● synced ${formatSyncTime()}`}
          {syncStatus === 'pending' && '○ pending...'}
          {syncStatus === 'syncing' && <span className="blink">● syncing</span>}
          {syncStatus === 'error' && '● error'}
        </span>
        <span>
          {text.length} chars
          {hasUnsavedChanges && ' • unsaved'}
        </span>
      </div>
    </div>
  );
}

export default App;
