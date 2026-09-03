// api.js
// Wrapper único em cima de fetch. Guarda o JWT no localStorage e manda
// ele no header Authorization em toda chamada autenticada. Todo o resto
// do app chama Api.get/post/etc — nunca fetch() direto.

const TOKEN_STORAGE_KEY = 'portal_cartas_token';

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

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

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
      const message = (body && body.message) || MESSAGES.GENERIC_ERROR;
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
