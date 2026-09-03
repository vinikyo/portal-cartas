// admin.js
// Lógica da tela de gerenciamento de cartas: autenticação, listagem, filtro
// e paginação (resolvidos no back-end: GET /cards?page=&per_page=&search=&
// game=&rarity=) e ações da tabela. O formulário de criar/editar em si (o
// modal) mora em card-modal.js, compartilhado com detail.html.

let cardsCache = [];
let filters = { search: '', game: '', rarity: '' };
let pagination = { page: 1, perPage: 12, total: 0, totalPages: 1 };

window.addEventListener('error', (event) => {
  console.error('[portal-cartas] Erro não tratado:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[portal-cartas] Promise rejeitada sem catch:', event.reason);
});

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  CardModal.init({ onSaved: () => loadCards() });
  bindEvents();
  await loadCards();
  openEditFromUrlIfAny();
});

// se veio de um link antigo com "?edit=123" (ex: favorito salvo), já abre
// o modal de edição — hoje em dia a edição a partir do detalhe abre o modal
// direto na própria página de detalhes, sem precisar desse parâmetro.
function openEditFromUrlIfAny() {
  const params = new URLSearchParams(window.location.search);
  const editId = Number(params.get('edit'));
  if (!editId) return;

  const card = cardsCache.find((c) => c.id === editId);
  if (card) {
    CardModal.open(card);
  } else {
    // a carta pode estar em outra página da listagem — busca direto
    Api.get(`/cards/${editId}`)
      .then((c) => CardModal.open(c))
      .catch(() => showToast('Carta não encontrada.', 'error'));
  }

  // limpa o parâmetro da URL pra não reabrir o modal num refresh
  window.history.replaceState({}, '', 'admin.html');
}

// ---------- Auth ----------

async function checkAuth() {
  if (!Api.getToken()) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const user = await Api.get('/me');
    qs('#current-username').textContent = user.username;
  } catch (error) {
    Api.clearToken();
    window.location.href = 'login.html';
  }
}

function bindEvents() {
  qs('#logout-button').addEventListener('click', () => {
    Api.clearToken();
    window.location.href = 'login.html';
  });

  qs('#new-card-button').addEventListener('click', () => CardModal.open());

  qs('#cards-tbody').addEventListener('click', onTableClick);

  qs('#filter-search').addEventListener('input', debounce((event) => {
    filters.search = event.target.value.trim();
    pagination.page = 1;
    loadCards();
  }, 300));

  qs('#filter-game').addEventListener('change', (event) => {
    filters.game = event.target.value;
    pagination.page = 1;
    loadCards();
  });

  qs('#filter-rarity').addEventListener('change', (event) => {
    filters.rarity = event.target.value;
    pagination.page = 1;
    loadCards();
  });

  qs('#pagination-prev').addEventListener('click', () => goToPage(pagination.page - 1));
  qs('#pagination-next').addEventListener('click', () => goToPage(pagination.page + 1));
}

function goToPage(page) {
  if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
  pagination.page = page;
  loadCards();
  qs('#table-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Listar cartas (filtro + paginação resolvidos no back-end) ----------

async function loadCards() {
  const loading = qs('#loading-state');
  loading.hidden = false;
  qs('#empty-state').hidden = true;

  const params = new URLSearchParams({
    page: pagination.page,
    per_page: pagination.perPage,
  });
  if (filters.search) params.set('search', filters.search);
  if (filters.game) params.set('game', filters.game);
  if (filters.rarity) params.set('rarity', filters.rarity);

  try {
    const result = await Api.get(`/cards?${params.toString()}`);
    cardsCache = result.items;
    pagination.page = result.page;
    pagination.total = result.total;
    pagination.totalPages = result.total_pages;
    renderTable();
    renderPagination();
  } catch (error) {
    showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
  } finally {
    loading.hidden = true;
  }
}

function renderTable() {
  const tbody = qs('#cards-tbody');
  const empty = qs('#empty-state');

  tbody.innerHTML = '';

  if (cardsCache.length === 0) {
    empty.hidden = false;
    const hasActiveFilter = filters.search || filters.game || filters.rarity;
    empty.textContent = hasActiveFilter ? MESSAGES.NO_RESULTS : 'Nenhuma carta cadastrada ainda.';
    return;
  }
  empty.hidden = true;

  cardsCache.forEach((card) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Imagem">${cardImageHtml(card)}</td>
      <td data-label="Nome (EN)">
        <a class="cards-table__link" href="detail.html?id=${card.id}">${escapeHtml(card.name_en)}</a>
      </td>
      <td data-label="Nome (PT)">${escapeHtml(card.name_pt || '—')}</td>
      <td data-label="Card Game">${gameBadgeHtml(card)}</td>
      <td data-label="Edição">${escapeHtml(card.edition_name)}</td>
      <td data-label="Raridade">${rarityBadgeHtml(card)}</td>
      <td data-label="Ações">
        <div class="cards-table__actions">
          <a class="btn btn--small btn--ghost" href="detail.html?id=${card.id}">Ver</a>
          <button class="btn btn--small" data-action="edit" data-id="${card.id}">Editar</button>
          <button class="btn btn--small btn--danger" data-action="delete" data-id="${card.id}">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPagination() {
  const nav = qs('#pagination');
  const { page, totalPages, total } = pagination;

  nav.hidden = total === 0;
  qs('#pagination-info').textContent = `Página ${page} de ${totalPages} · ${total} carta${total === 1 ? '' : 's'}`;
  qs('#pagination-prev').disabled = page <= 1;
  qs('#pagination-next').disabled = page >= totalPages;
}

function gameBadgeHtml(card) {
  const label = GAME_LABELS[card.card_game] || card.card_game;
  return `<span class="badge badge--game-${escapeHtml(card.card_game)}">${escapeHtml(label)}</span>`;
}

function rarityBadgeHtml(card) {
  const label = RARITY_LABELS[card.rarity] || card.rarity;
  return `<span class="badge badge--rarity-${escapeHtml(card.rarity)}">${escapeHtml(label)}</span>`;
}

function cardImageHtml(card) {
  if (card.image_url) {
    return `<img src="${escapeHtml(API_BASE_URL + card.image_url)}" alt="Imagem de ${escapeHtml(card.name_en)}" class="card-thumb" />`;
  }
  return `<div class="card-thumb card-thumb--placeholder">${MESSAGES.NO_IMAGE}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Ações da tabela ----------

async function onTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;
  const card = cardsCache.find((c) => c.id === id);

  if (action === 'edit') {
    if (card) CardModal.open(card);
  }

  if (action === 'delete') {
    const cardLabel = card ? (card.name_pt ? `${card.name_en} (${card.name_pt})` : card.name_en) : 'esta carta';
    if (!confirm(MESSAGES.CONFIRM_DELETE(cardLabel))) return;
    try {
      await Api.delete(`/cards/${id}`);
      showToast(MESSAGES.CARD_DELETED, 'success');
      // se excluiu o último item da página atual (e não é a página 1), volta uma página
      if (cardsCache.length === 1 && pagination.page > 1) {
        pagination.page -= 1;
      }
      loadCards();
    } catch (error) {
      showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
    }
  }
}


