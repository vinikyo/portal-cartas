// utils.js
// Funções pequenas e reutilizáveis usadas em mais de uma tela.

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function showToast(message, type = 'info') {
  const container = qs('#toast-container') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function createToastContainer() {
  const el = document.createElement('div');
  el.id = 'toast-container';
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

function setButtonLoading(button, isLoading, loadingText = 'Carregando...') {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add('is-loading');
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove('is-loading');
  }
}

function clearFieldErrors(form) {
  qsa('.field-error', form).forEach((el) => (el.textContent = ''));
  qsa('.is-invalid', form).forEach((el) => el.classList.remove('is-invalid'));
}

function applyFieldErrors(form, errors) {
  Object.entries(errors || {}).forEach(([field, message]) => {
    const input = qs(`[name="${field}"]`, form);
    const errorEl = qs(`[data-error-for="${field}"]`, form);
    if (input) input.classList.add('is-invalid');
    if (errorEl) errorEl.textContent = message;
  });
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
