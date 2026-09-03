// consts.js
// Constantes usadas em mais de um arquivo: URL da API e mensagens padrão.

const API_BASE_URL = 'http://localhost:8000/api';

const MESSAGES = {
  LOGIN_ERROR: 'Usuário ou senha inválidos.',
  LOGIN_EMPTY: 'Preencha usuário e senha.',
  GENERIC_ERROR: 'Ocorreu um erro. Tente novamente.',
  CARD_SAVED: 'Carta salva com sucesso.',
  CARD_DELETED: 'Carta excluída com sucesso.',
  CONFIRM_DELETE: (name) => `Tem certeza que deseja excluir "${name}"? Essa ação não pode ser desfeita.`,
  FIELD_REQUIRED: 'Este campo é obrigatório.',
  LOADING_EDITIONS: 'Carregando edições...',
  SELECT_GAME_FIRST: 'Selecione um Card Game primeiro',
  UPLOADING_IMAGE: 'Enviando imagem...',
  IMAGE_TOO_LARGE: 'Imagem muito grande (máximo 5MB).',
  IMAGE_INVALID_TYPE: 'Formato inválido. Use JPG, PNG ou WEBP.',
  NO_IMAGE: 'Sem imagem',
  NO_RESULTS: 'Nenhuma carta encontrada com esses filtros.',
};

const GAME_LABELS = {
  magic: 'Magic: The Gathering',
  pokemon: 'Pokémon',
  yugioh: 'Yu-Gi-Oh!',
};

const RARITY_LABELS = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  super_rare: 'Super Rara',
  ultra_rare: 'Ultra Rara',
  secret_rare: 'Secreta Rara',
};
