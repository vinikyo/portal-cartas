// Tema global: respeita a preferência do sistema na primeira visita e salva
// apenas quando o usuário escolhe manualmente claro ou escuro.
(() => {
  const STORAGE_KEY = 'portal-cartas-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  function storedTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function updateButtons(theme) {
    const dark = theme === 'dark';
    const label = dark ? 'Ativar modo claro' : 'Ativar modo escuro';

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(dark));
    });
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    updateButtons(theme);
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      // O tema continua funcionando durante a sessão mesmo sem localStorage.
    }
  }

  applyTheme(storedTheme() || (systemTheme.matches ? 'dark' : 'light'));

  document.addEventListener('DOMContentLoaded', () => {
    updateButtons(document.documentElement.dataset.theme);

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        saveTheme(next);
        applyTheme(next);
      });
    });
  });

  systemTheme.addEventListener('change', (event) => {
    if (!storedTheme()) applyTheme(event.matches ? 'dark' : 'light');
  });
})();
