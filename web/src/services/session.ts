// Session management with persistent cross-tab sessions

const SESSION_KEY = 'uc:session';

// Clean up old dev mode keys (one-time cleanup)
function cleanupOldDevModeKeys(): void {
  const oldKeys = ['uc:devMode', 'uc:devSession'];
  oldKeys.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
    }
  });
  if (sessionStorage.getItem('uc:devSession') !== null) {
    sessionStorage.removeItem('uc:devSession');
  }
}

/**
 * Get the current session ID
 * Uses persistent cross-tab session (localStorage)
 */
export function getSessionId(): string {
  // Clean up old dev mode keys on first access
  cleanupOldDevModeKeys();
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}
