// detail.js
// Lógica da página de detalhes de uma carta. Pega o id pela query string
// (?id=123) — é a "rota" dessa página, separada da listagem/paginação.
// A edição abre no mesmo modal usado no gerenciador (card-modal.js), sem
// navegar de volta pra admin.html.

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;
  CardModal.init({ onSaved: (card) => { storeCard(card); renderCard(card); } });
  bindEvents();
  await loadCard();
});

function checkAuth() {
  const token = Api.getToken();
  const payload = Api.getTokenPayload();
  if (!token || !payload || (payload.exp && payload.exp <= Math.floor(Date.now() / 1000))) {
    Api.clearToken();
    window.location.href = 'login.html';
    return false;
  }

  qs('#current-username').textContent = payload.username || '';
  return true;
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
  const detail = qs('#detail-card');
  const id = getCardId();

  if (!id) {
    loading.hidden = true;
    errorState.hidden = false;
    errorState.textContent = 'Carta inválida — volte para o gerenciador e tente de novo.';
    return;
  }

  const cachedCard = getStoredCard(id);
  if (cachedCard && Number(cachedCard.id) === id) {
    renderCard(cachedCard);
    loading.hidden = true;
    errorState.hidden = true;
    detail.hidden = false;
    return;
  }

  try {
    const card = await Api.get(`/cards/${id}`);
    storeCard(card);
    renderCard(card);
    loading.hidden = true;
    errorState.hidden = true;
    detail.hidden = false;
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

  renderBadge(qs('#detail-game-badge'), 'badge--game-', card.card_game, gameLabel, GAME_LABELS);
  renderBadge(qs('#detail-rarity-badge'), 'badge--rarity-', card.rarity, rarityLabel, RARITY_LABELS);

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

function renderBadge(container, prefix, key, label, allowedMap) {
  container.replaceChildren();
  const badge = document.createElement('span');
  badge.className = `badge ${prefix}${Object.prototype.hasOwnProperty.call(allowedMap, key) ? key : ''}`;
  badge.textContent = label;
  container.appendChild(badge);
}
