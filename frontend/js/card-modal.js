// card-modal.js
// Modal de criar/editar carta — compartilhado entre admin.html e detail.html,
// pra poder abrir o mesmo formulário em qualquer uma das duas telas em vez
// de sempre navegar de volta pro gerenciador.
//
// Como usar numa página:
//   1. Carregar este arquivo DEPOIS de consts.js/utils.js/api.js e ANTES do
//      script da própria página. O markup é criado aqui uma única vez.
//   2. No DOMContentLoaded da página, chamar:
//   3. Pra abrir: CardModal.open(card) (edição) ou CardModal.open() (nova).

const CardModal = (() => {
  let editingCardId = null;
  let selectedImageBase64 = null; // null = não trocou a imagem nesta edição
  let originalImageUrl = null;
  let onSaved = () => {};
  const editionsCache = Object.create(null);

  function ensureModal() {
    if (qs('#card-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'card-modal';
    modal.className = 'modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal__backdrop" data-close-modal></div>
      <div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal__header">
          <h2 id="modal-title">Nova Carta</h2>
          <button type="button" class="modal__close" data-close-modal aria-label="Fechar">&times;</button>
        </div>
        <form id="card-form" class="form" novalidate>
          <div class="form-group">
            <label for="name_en">Nome em inglês *</label>
            <input type="text" id="name_en" name="name_en" required maxlength="150" />
            <div class="form-group__footer"><span class="field-error" data-error-for="name_en"></span><span class="field-hint" data-counter-for="name_en">0/150</span></div>
          </div>
          <div class="form-group">
            <label for="name_pt">Nome em português</label>
            <input type="text" id="name_pt" name="name_pt" maxlength="150" />
            <div class="form-group__footer"><span class="field-error" data-error-for="name_pt"></span><span class="field-hint" data-counter-for="name_pt">0/150</span></div>
          </div>
          <div class="form-group">
            <label for="card_game">Card Game *</label>
            <select id="card_game" name="card_game" required>
              <option value="">Selecione...</option>
              <option value="magic">Magic: The Gathering</option>
              <option value="pokemon">Pokémon</option>
              <option value="yugioh">Yu-Gi-Oh!</option>
            </select>
            <span class="field-error" data-error-for="card_game"></span>
          </div>
          <div class="form-group">
            <label for="edition_id">Edição *</label>
            <select id="edition_id" name="edition_id" required disabled><option value="">Selecione um Card Game primeiro</option></select>
            <span class="field-error" data-error-for="edition_id"></span>
          </div>
          <div class="form-group">
            <label for="image_file">Imagem da Carta</label>
            <div class="image-upload">
              <div class="image-upload__preview-box">
                <img id="image_preview" class="image-upload__preview" alt="Pré-visualização da carta" hidden />
                <div id="image_preview_placeholder" class="card-thumb card-thumb--placeholder">Sem imagem</div>
              </div>
              <input type="file" id="image_file" accept="image/png, image/jpeg, image/webp" />
            </div>
            <div id="remove_image_group" class="image-upload__remove" hidden>
              <label><input type="checkbox" id="remove_image" /> Remover imagem atual</label>
            </div>
          </div>
          <div class="form-group">
            <label for="rarity">Raridade *</label>
            <select id="rarity" name="rarity" required>
              <option value="">Selecione...</option>
              <option value="common">Comum</option><option value="uncommon">Incomum</option><option value="rare">Rara</option>
              <option value="super_rare">Super Rara</option><option value="ultra_rare">Ultra Rara</option><option value="secret_rare">Secreta Rara</option>
            </select>
            <span class="field-error" data-error-for="rarity"></span>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--ghost" data-close-modal>Cancelar</button>
            <button type="button" id="save-card-button" class="btn btn--primary">Salvar</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
  }

  function init(options = {}) {
    onSaved = options.onSaved || (() => {});
    ensureModal();

    qsa('[data-close-modal]').forEach((el) => el.addEventListener('click', close));
    qs('#card_game').addEventListener('change', onGameChange);

    // O botão Salvar não é type="submit" de propósito: escolher um arquivo no
    // seletor nativo do input de imagem pode disparar um submit implícito do
    // formulário em alguns navegadores assim que o foco volta pra página.
    qs('#card-form').addEventListener('submit', (event) => event.preventDefault());
    qs('#save-card-button').addEventListener('click', onSubmitCard);
    qs('#image_file').addEventListener('change', onImageFileChange);
    qs('#remove_image').addEventListener('change', onRemoveImageChange);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !qs('#card-modal').hidden) close();
    });

    Object.keys(FIELD_LIMITS).forEach(bindLengthCounter);
  }

  // ---------- Limite de caracteres (name_en / name_pt) ----------

  // O atributo HTML `maxlength` já limita a digitação normal, mas colar um
  // texto muito longo tem comportamento inconsistente em alguns navegadores
  // mobile (o valor pode passar do limite até a próxima tecla apertada). Por
  // isso: 1) corta o excesso a cada 'input' (cobre o caso do paste), 2) mostra
  // um contador ao vivo, e 3) valida de novo antes de enviar — assim o limite
  // aparece como validação do próprio campo, nunca como erro de banco.
  function bindLengthCounter(field) {
    const input = qs(`#${field}`);
    const counter = qs(`[data-counter-for="${field}"]`);
    const max = FIELD_LIMITS[field];

    const update = () => {
      if (input.value.length > max) {
        input.value = input.value.slice(0, max);
      }
      const len = input.value.length;
      counter.textContent = `${len}/${max}`;
      counter.classList.toggle('field-hint--warning', len >= max * 0.9 && len < max);
      counter.classList.toggle('field-hint--danger', len >= max);
    };

    input.addEventListener('input', update);
    input._updateCounter = update; // reaproveitado por open() ao preencher valores existentes
  }

  function validateLengths() {
    const errors = {};
    Object.entries(FIELD_LIMITS).forEach(([field, max]) => {
      const input = qs(`#${field}`);
      if (input.value.length > max) {
        const label = qs(`label[for="${field}"]`).textContent.replace(/\s*\*$/, '');
        errors[field] = MESSAGES.FIELD_TOO_LONG(label, max);
      }
    });
    return errors;
  }

  function open(card = null) {
    const form = qs('#card-form');
    form.reset();
    clearFieldErrors(form);
    resetEditionSelect();
    resetImageField();

    editingCardId = card ? card.id : null;
    originalImageUrl = card?.image_url || null;
    qs('#modal-title').textContent = card ? 'Editar Carta' : 'Nova Carta';

    if (card) {
      qs('#name_en').value = card.name_en;
      qs('#name_pt').value = card.name_pt || '';
      qs('#rarity').value = card.rarity;

      if (card.image_url) {
        const preview = qs('#image_preview');
        preview.src = API_BASE_URL + card.image_url;
        preview.hidden = false;
        qs('#image_preview_placeholder').hidden = true;
        qs('#remove_image_group').hidden = false;
      } else {
        qs('#remove_image_group').hidden = true;
      }

      // dispara a busca de edições e, quando terminar, seleciona a atual
      qs('#card_game').value = card.card_game;
      onGameChange().then(() => {
        qs('#edition_id').value = card.edition_id;
      });
    }

    // atualiza o contador de caracteres pro valor atual do campo (0 no caso
    // de carta nova, já que form.reset() limpou tudo acima; o valor real da
    // carta no caso de edição)
    Object.keys(FIELD_LIMITS).forEach((field) => qs(`#${field}`)._updateCounter());

    qs('#remove_image').checked = false;
    qs('#card-modal').hidden = false;
  }

  function close() {
    qs('#card-modal').hidden = true;
    qs('#remove_image').checked = false;
    qs('#remove_image_group').hidden = true;
    editingCardId = null;
    originalImageUrl = null;
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
      selectedImageBase64 = reader.result;
      qs('#remove_image').checked = false;
      const preview = qs('#image_preview');
      preview.src = reader.result;
      preview.hidden = false;
      qs('#image_preview_placeholder').hidden = true;
      qs('#remove_image_group').hidden = !originalImageUrl;
    };
    reader.onerror = () => showToast(MESSAGES.GENERIC_ERROR, 'error');
    reader.readAsDataURL(file);
  }

  function onRemoveImageChange(event) {
    const checked = event.target.checked;
    selectedImageBase64 = null;
    qs('#image_file').value = '';

    const preview = qs('#image_preview');
    const placeholder = qs('#image_preview_placeholder');

    if (checked) {
      preview.hidden = true;
      placeholder.hidden = false;
      placeholder.textContent = MESSAGES.NO_IMAGE;
      return;
    }

    if (originalImageUrl) {
      preview.src = API_BASE_URL + originalImageUrl;
      preview.hidden = false;
      placeholder.hidden = true;
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

    resetEditionSelect();
    if (!game) return;

    select.innerHTML = `<option value="">${MESSAGES.LOADING_EDITIONS}</option>`;
    select.disabled = true;

    try {
      let editions = editionsCache[game];
      if (!editions) {
        editions = await Api.get(`/editions?game=${encodeURIComponent(game)}`);
        editionsCache[game] = editions;
      }

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

    const lengthErrors = validateLengths();
    if (Object.keys(lengthErrors).length > 0) {
      applyFieldErrors(form, lengthErrors);
      return;
    }

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
    if (editingCardId && qs('#remove_image').checked) {
      payload.remove_image = true;
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
