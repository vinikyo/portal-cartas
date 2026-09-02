// admin.js
// Lógica da tela de gerenciamento de cartas: autenticação, CRUD, upload
// de imagem, select em cascata e filtro da listagem.

let cardsCache = [];
let editingCardId = null;
let filters = { search: '', game: '', rarity: '' };

// Captura qualquer erro/rejeição não tratada e loga no Console com um
// prefixo bem visível. Ajuda a identificar rapidamente se algo está
// quebrando o fluxo do DOM silenciosamente (ex: durante o upload de imagem).
window.addEventListener('error', (event) => {
  console.error('[portal-cartas] Erro não tratado:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[portal-cartas] Promise rejeitada sem catch:', event.reason);
});

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  bindEvents();
  loadCards();
});

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

  qs('#new-card-button').addEventListener('click', () => openModal());

  qsa('[data-close-modal]').forEach((el) =>
    el.addEventListener('click', closeModal)
  );

  qs('#card_game').addEventListener('change', onGameChange);

  // O botão Salvar não é mais type="submit" de propósito: em vários
  // navegadores, escolher um arquivo no seletor nativo do input de imagem
  // (confirmando com Enter/duplo-clique) dispara um submit IMPLÍCITO do
  // formulário assim que o foco volta pra página — o que salvava a carta
  // sem a imagem ainda enviada e fechava o modal sozinho. Com o botão como
  // "button" e o save preso só ao clique dele, isso nunca mais acontece.
  // O listener de 'submit' abaixo é só uma segurança extra, caso algum
  // navegador ainda tente disparar o submit nativo por outro caminho.
  qs('#card-form').addEventListener('submit', (event) => event.preventDefault());
  qs('#save-card-button').addEventListener('click', onSubmitCard);

  qs('#cards-tbody').addEventListener('click', onTableClick);
  qs('#image_file').addEventListener('change', onImageFileChange);

  qs('#filter-search').addEventListener('input', debounce((event) => {
    filters.search = event.target.value.trim().toLowerCase();
    renderTable();
  }, 250));

  qs('#filter-game').addEventListener('change', (event) => {
    filters.game = event.target.value;
    renderTable();
  });

  qs('#filter-rarity').addEventListener('change', (event) => {
    filters.rarity = event.target.value;
    renderTable();
  });
}

// ---------- Listar cartas ----------

async function loadCards() {
  const loading = qs('#loading-state');
  loading.hidden = false;
  qs('#empty-state').hidden = true;

  try {
    cardsCache = await Api.get('/cards');
    renderTable();
  } catch (error) {
    showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
  } finally {
    loading.hidden = true;
  }
}

// filtra por texto (nome EN/PT/edição) + Card Game + Raridade,
// usando os mesmos campos preenchidos no cadastro.
function getFilteredCards() {
  return cardsCache.filter((card) => {
    if (filters.game && card.card_game !== filters.game) return false;
    if (filters.rarity && card.rarity !== filters.rarity) return false;

    if (filters.search) {
      const haystack = [card.name_en, card.name_pt, card.edition_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(filters.search)) return false;
    }

    return true;
  });
}

function renderTable() {
  const tbody = qs('#cards-tbody');
  const empty = qs('#empty-state');
  const filtered = getFilteredCards();

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    empty.hidden = false;
    empty.textContent = cardsCache.length === 0
      ? 'Nenhuma carta cadastrada ainda.'
      : MESSAGES.NO_RESULTS;
    return;
  }
  empty.hidden = true;

  filtered.forEach((card) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Imagem">${cardImageHtml(card)}</td>
      <td data-label="Nome (EN)">${escapeHtml(card.name_en)}</td>
      <td data-label="Nome (PT)">${escapeHtml(card.name_pt || '—')}</td>
      <td data-label="Card Game">${gameBadgeHtml(card)}</td>
      <td data-label="Edição">${escapeHtml(card.edition_name)}</td>
      <td data-label="Raridade">${rarityBadgeHtml(card)}</td>
      <td class="cards-table__actions">
        <button class="btn btn--small" data-action="edit" data-id="${card.id}">Editar</button>
        <button class="btn btn--small btn--danger" data-action="delete" data-id="${card.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
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
    return `<img src="${escapeHtml(card.image_url)}" alt="Imagem de ${escapeHtml(card.name_en)}" class="card-thumb" />`;
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
    if (card) openModal(card);
  }

  if (action === 'delete') {
    const cardLabel = card ? (card.name_pt ? `${card.name_en} (${card.name_pt})` : card.name_en) : 'esta carta';
    if (!confirm(MESSAGES.CONFIRM_DELETE(cardLabel))) return;
    try {
      await Api.delete(`/cards/${id}`);
      showToast(MESSAGES.CARD_DELETED, 'success');
      loadCards();
    } catch (error) {
      showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
    }
  }
}

// ---------- Upload de imagem ----------

async function onImageFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview = qs('#image_preview');
  const placeholder = qs('#image_preview_placeholder');

  if (file.size > 5 * 1024 * 1024) {
    showToast(MESSAGES.IMAGE_TOO_LARGE, 'error');
    event.target.value = '';
    return;
  }

  placeholder.hidden = false;
  placeholder.textContent = MESSAGES.UPLOADING_IMAGE;
  preview.hidden = true;

  try {
    const result = await Api.uploadImage(file);
    qs('#image_url').value = result.url;
    preview.src = result.url;
    preview.hidden = false;
    placeholder.hidden = true;
  } catch (error) {
    showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
    placeholder.textContent = MESSAGES.NO_IMAGE;
    placeholder.hidden = false;
  }
}

// ---------- Modal / Formulário ----------

function openModal(card = null) {
  const form = qs('#card-form');
  form.reset();
  clearFieldErrors(form);
  resetEditionSelect();
  resetImageField();

  editingCardId = card ? card.id : null;
  qs('#modal-title').textContent = card ? 'Editar Carta' : 'Nova Carta';
  qs('#card-id').value = card ? card.id : '';

  if (card) {
    qs('#name_en').value = card.name_en;
    qs('#name_pt').value = card.name_pt || '';
    qs('#rarity').value = card.rarity;

    if (card.image_url) {
      qs('#image_url').value = card.image_url;
      const preview = qs('#image_preview');
      preview.src = card.image_url;
      preview.hidden = false;
      qs('#image_preview_placeholder').hidden = true;
    }

    // dispara a busca de edições e, quando terminar, seleciona a atual
    qs('#card_game').value = card.card_game;
    onGameChange().then(() => {
      qs('#edition_id').value = card.edition_id;
    });
  }

  qs('#card-modal').hidden = false;
}

function resetImageField() {
  qs('#image_file').value = '';
  qs('#image_url').value = '';
  qs('#image_preview').hidden = true;
  const placeholder = qs('#image_preview_placeholder');
  placeholder.hidden = false;
  placeholder.textContent = MESSAGES.NO_IMAGE;
}

function closeModal() {
  qs('#card-modal').hidden = true;
  editingCardId = null;
}

async function onSubmitCard(event) {
  if (event) event.preventDefault();
  const form = qs('#card-form');
  clearFieldErrors(form);

  const editionSelect = qs('#edition_id');
  const editionName = editionSelect.selectedOptions[0]
    ? editionSelect.selectedOptions[0].textContent
    : '';

  const payload = {
    name_en: qs('#name_en').value.trim(),
    name_pt: qs('#name_pt').value.trim() || null,
    card_game: qs('#card_game').value,
    edition_id: editionSelect.value,
    edition_name: editionName,
    image_url: qs('#image_url').value || null,
    rarity: qs('#rarity').value,
  };

  const button = qs('#save-card-button');
  setButtonLoading(button, true, 'Salvando...');

  try {
    if (editingCardId) {
      await Api.put(`/cards/${editingCardId}`, payload);
    } else {
      await Api.post('/cards', payload);
    }
    showToast(MESSAGES.CARD_SAVED, 'success');
    closeModal();
    loadCards();
  } catch (error) {
    if (error.errors) {
      applyFieldErrors(form, error.errors);
    }
    showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
  } finally {
    setButtonLoading(button, false);
  }
}

// ---------- Select em cascata (Card Game -> Edição) ----------

function resetEditionSelect() {
  const select = qs('#edition_id');
  select.innerHTML = `<option value="">${MESSAGES.SELECT_GAME_FIRST}</option>`;
  select.disabled = true;
}

async function onGameChange() {
  const game = qs('#card_game').value;
  const select = qs('#edition_id');

  // ao trocar o jogo, a seleção anterior é sempre resetada
  resetEditionSelect();

  if (!game) return;

  select.innerHTML = `<option value="">${MESSAGES.LOADING_EDITIONS}</option>`;
  select.disabled = true;

  try {
    const editions = await Api.get(`/editions?game=${encodeURIComponent(game)}`);

    select.innerHTML = '<option value="">Selecione...</option>';
    editions.forEach((edition) => {
      const option = document.createElement('option');
      option.value = edition.id;
      option.textContent = edition.name;
      select.appendChild(option);
    });
    select.disabled = false;
  } catch (error) {
    select.innerHTML = '<option value="">Erro ao carregar edições</option>';
    showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
  }
}
