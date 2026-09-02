// login.js
// Lógica exclusiva da tela de login.

document.addEventListener('DOMContentLoaded', () => {
  const form = qs('#login-form');
  const button = qs('#login-button');

  // se já tem um token válido guardado, pula direto pro admin
  if (Api.getToken()) {
    Api.get('/me')
      .then(() => (window.location.href = 'admin.html'))
      .catch(() => Api.clearToken());
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const username = qs('#username').value.trim();
    const password = qs('#password').value;

    if (!username || !password) {
      showToast(MESSAGES.LOGIN_EMPTY, 'error');
      return;
    }

    setButtonLoading(button, true, 'Entrando...');

    try {
      const result = await Api.post('/login', { username, password });
      Api.setToken(result.token);
      window.location.href = 'admin.html';
    } catch (error) {
      showToast(error.message || MESSAGES.LOGIN_ERROR, 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
});
