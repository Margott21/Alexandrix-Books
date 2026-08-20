// Alexandrix Books — sessão + armazenamento por usuário (front-end apenas)
(function () {
  const SESSION_KEY = 'alexandrix_session';

  function session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }
  function uid() {
    const s = session();
    return s && s.userId ? String(s.userId) : 'guest';
  }
  // Chave isolada por conta: cada usuário cadastrado tem seus próprios dados
  function key(base) { return `${base}::${uid()}`; }

  function logout(redirect) {
    localStorage.removeItem(SESSION_KEY);
    if (redirect) location.href = redirect;
  }

  function requireAuth() {
    if (!session()) {
      location.replace('./auth.html?next=profile');
      return false;
    }
    return true;
  }

  window.AX = { SESSION_KEY, session, uid, key, logout, requireAuth };
})();
