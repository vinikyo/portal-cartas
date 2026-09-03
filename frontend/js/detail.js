// detail.js
// Lógica da página de detalhes de uma carta. Pega o id pela query string
// (?id=123) — é a "rota" dessa página, separada da listagem/paginação.
// A edição abre no mesmo modal usado no gerenciador (card-modal.js), sem
// navegar de volta pra admin.html.

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  CardModal.init({ onSaved: (card) => renderCard(card) });
  bindEvents();
  await loadCard();
});

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

let currentCard = null;

function bindEvents() {
  qs('#logout-button').addEventListener('click', () => {
    Api.clearToken();
    window.location.href = 'login.html';
  });

  qs('#edit-from-detail').addEventListener('click', () => {
    if (currentCard) CardModal.open(currentCard);
  });
}

function getCardId() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadCard() {
  const loading = qs('#loading-state');
  const errorState = qs('#error-state');
  const id = getCardId();

  if (!id) {
    loading.hidden = true;
    errorState.hidden = false;
    errorState.textContent = 'Carta inválida — volte para o gerenciador e tente de novo.';
    return;
  }

  try {
    const card = await Api.get(`/cards/${id}`);
    renderCard(card);
    loading.hidden = true;
    qs('#detail-card').hidden = false;
  } catch (error) {
    loading.hidden = true;
    errorState.hidden = false;
    errorState.textContent = error.status === 404
      ? 'Essa carta não existe (ou foi excluída).'
      : (error.message || MESSAGES.GENERIC_ERROR);
  }
}

function renderCard(card) {
  currentCard = card;
  document.title = `${card.name_en} — Portal de Cartas`;

  qs('#detail-name-en').textContent = card.name_en;

  const namePt = qs('#detail-name-pt');
  if (card.name_pt) {
    namePt.textContent = card.name_pt;
    namePt.hidden = false;
  } else {
    namePt.hidden = true;
  }

  const gameLabel = GAME_LABELS[card.card_game] || card.card_game;
  const rarityLabel = RARITY_LABELS[card.rarity] || card.rarity;

  qs('#detail-game-badge').innerHTML = `<span class="badge badge--game-${card.card_game}">${escapeHtml(gameLabel)}</span>`;
  qs('#detail-rarity-badge').innerHTML = `<span class="badge badge--rarity-${card.rarity}">${escapeHtml(rarityLabel)}</span>`;

  qs('#detail-game').textContent = gameLabel;
  qs('#detail-edition').textContent = card.edition_name;
  qs('#detail-rarity').textContent = rarityLabel;

  const image = qs('#detail-image');
  const placeholder = qs('#detail-image-placeholder');
  if (card.image_url) {
    image.src = API_BASE_URL + card.image_url;
    image.alt = `Imagem de ${card.name_en}`;
    image.hidden = false;
    placeholder.hidden = true;
  } else {
    image.hidden = true;
    placeholder.hidden = false;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
