// login.js
// Lógica exclusiva da tela de login.

document.addEventListener('DOMContentLoaded', () => {
  const form = qs('#login-form');
  const button = qs('#login-button');

  // Se já existe um JWT ainda não expirado, não precisa de round-trip para /me:
  // as páginas protegidas continuam validando a assinatura no servidor em cada API call.
  const payload = Api.getTokenPayload();
  if (Api.getToken() && payload && (!payload.exp || payload.exp > Math.floor(Date.now() / 1000))) {
    window.location.href = 'admin.html';
  } else if (Api.getToken()) {
    Api.clearToken();
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
      const next = new URLSearchParams(window.location.search).get('next');
      let destination = 'admin.html';
      if (next) {
        try {
          const nextUrl = new URL(next, window.location.origin);
          if (nextUrl.origin === window.location.origin) {
            destination = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
          }
        } catch (e) {
          // mantém o destino padrão quando `next` não é uma URL válida
        }
      }
      window.location.href = destination;
    } catch (error) {
      showToast(error.message || MESSAGES.LOGIN_ERROR, 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
});
