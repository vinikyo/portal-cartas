// api.js
// Wrapper único em cima de fetch. Guarda o JWT no localStorage e manda
// ele no header Authorization em toda chamada autenticada. Todo o resto
// do app chama Api.get/post/etc — nunca fetch() direto.

const TOKEN_STORAGE_KEY = 'portal_cartas_token';
const REQUEST_TIMEOUT_MS = 5000; // 5s antes de desistir e mostrar erro de timeout pro usuário

const Api = {
  getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  setToken(token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },

  async request(path, options = {}) {
    const token = this.getToken();

    // AbortController cancela o fetch se ele passar do tempo limite — sem
    // isso, um back-end travado/fora do ar deixa o front esperando pra
    // sempre (o navegador não tem timeout próprio curto o suficiente).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        const timeoutError = new Error(MESSAGES.REQUEST_TIMEOUT);
        timeoutError.status = 408;
        throw timeoutError;
      }

      // fetch rejeita com TypeError quando nem chega a ter resposta:
      // sem internet, servidor fora do ar, CORS bloqueado, etc.
      const networkError = new Error(MESSAGES.NETWORK_ERROR);
      networkError.status = 0;
      throw networkError;
    }
    clearTimeout(timeoutId);

    let body = null;
    try {
      body = await response.json();
    } catch (e) {
      // resposta sem corpo (ex: 204)
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
      }
      const fallbackMessage = response.status === 429 ? MESSAGES.RATE_LIMITED : MESSAGES.GENERIC_ERROR;
      const message = (body && body.message) || fallbackMessage;
      const error = new Error(message);
      error.status = response.status;
      error.errors = body && body.errors;
      throw error;
    }

    return body ? body.data : null;
  },

  get(path) {
    return this.request(path, { method: 'GET' });
  },

  post(path, data) {
    return this.request(path, { method: 'POST', body: JSON.stringify(data) });
  },

  put(path, data) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(data) });
  },

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },
};
