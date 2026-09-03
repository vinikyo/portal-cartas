// card-modal.js
// Modal de criar/editar carta — compartilhado entre admin.html e detail.html,
// pra poder abrir o mesmo formulário em qualquer uma das duas telas em vez
// de sempre navegar de volta pro gerenciador.
//
// Como usar numa página:
//   1. Incluir o markup do modal (#card-modal, ver admin.html) no HTML.
//   2. Carregar este arquivo DEPOIS de consts.js/utils.js/api.js e ANTES do
//      script da própria página.
//   3. No DOMContentLoaded da página, chamar:
//        CardModal.init({ onSaved: (card) => { ... atualiza a tela ... } });
//   4. Pra abrir: CardModal.open(card) (edição) ou CardModal.open() (nova).

const CardModal = (() => {
  let editingCardId = null;
  let selectedImageBase64 = null; // null = não trocou a imagem nesta edição
  let onSaved = () => {};

  function init(options = {}) {
    onSaved = options.onSaved || (() => {});

    qsa('[data-close-modal]').forEach((el) => el.addEventListener('click', close));
    qs('#card_game').addEventListener('change', onGameChange);

    // O botão Salvar não é type="submit" de propósito: escolher um arquivo no
    // seletor nativo do input de imagem pode disparar um submit implícito do
    // formulário em alguns navegadores assim que o foco volta pra página.
    qs('#card-form').addEventListener('submit', (event) => event.preventDefault());
    qs('#save-card-button').addEventListener('click', onSubmitCard);
    qs('#image_file').addEventListener('change', onImageFileChange);
  }

  function open(card = null) {
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
        const preview = qs('#image_preview');
        preview.src = API_BASE_URL + card.image_url;
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

  function close() {
    qs('#card-modal').hidden = true;
    editingCardId = null;
  }

  // ---------- Imagem (lida no navegador e mandada em base64 junto do payload) ----------

  function resetImageField() {
    selectedImageBase64 = null;
    qs('#image_file').value = '';
    qs('#image_preview').hidden = true;
    const placeholder = qs('#image_preview_placeholder');
    placeholder.hidden = false;
    placeholder.textContent = MESSAGES.NO_IMAGE;
  }

  function onImageFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast(MESSAGES.IMAGE_TOO_LARGE, 'error');
      event.target.value = '';
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast(MESSAGES.IMAGE_INVALID_TYPE, 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      selectedImageBase64 = reader.result; // data:image/png;base64,....
      const preview = qs('#image_preview');
      preview.src = reader.result;
      preview.hidden = false;
      qs('#image_preview_placeholder').hidden = true;
    };
    reader.onerror = () => showToast(MESSAGES.GENERIC_ERROR, 'error');
    reader.readAsDataURL(file);
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

  // ---------- Salvar ----------

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
      rarity: qs('#rarity').value,
    };

    // só manda o campo se o usuário escolheu um arquivo novo nesta edição —
    // assim dá pra editar os outros campos sem precisar reenviar a imagem.
    if (selectedImageBase64) {
      payload.image_base64 = selectedImageBase64;
    }

    const button = qs('#save-card-button');
    setButtonLoading(button, true, 'Salvando...');

    try {
      let saved;
      if (editingCardId) {
        saved = await Api.put(`/cards/${editingCardId}`, payload);
      } else {
        saved = await Api.post('/cards', payload);
      }
      showToast(MESSAGES.CARD_SAVED, 'success');
      close();
      onSaved(saved);
    } catch (error) {
      if (error.errors) {
        applyFieldErrors(form, error.errors);
      }
      showToast(error.message || MESSAGES.GENERIC_ERROR, 'error');
    } finally {
      setButtonLoading(button, false);
    }
  }

  return { init, open, close };
})();
