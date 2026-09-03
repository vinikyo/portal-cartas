<?php

/**
 * CardService
 *
 * Regra de negócio do CRUD de cartas: paginação/filtro da listagem,
 * validação do payload e conversão da imagem (recebida em base64 do
 * front) pro binário que vai pro banco.
 */
class CardService
{
    private Card $cardModel;

    public const GAMES = ['magic', 'pokemon', 'yugioh'];
    public const RARITIES = ['common', 'uncommon', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'];
    public const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
    public const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

    private const DEFAULT_PER_PAGE = 12;
    private const MAX_PER_PAGE = 50;

    public function __construct()
    {
        $this->cardModel = new Card();
    }

    public function list(array $query): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = (int) ($query['per_page'] ?? self::DEFAULT_PER_PAGE);
        $perPage = max(1, min($perPage, self::MAX_PER_PAGE));

        $filters = [
            'game'   => $query['game'] ?? null,
            'rarity' => $query['rarity'] ?? null,
            'search' => $query['search'] ?? null,
        ];

        $result = $this->cardModel->paginate($filters, $page, $perPage);

        return [
            'items'       => array_map([$this, 'decorate'], $result['items']),
            'page'        => $page,
            'per_page'    => $perPage,
            'total'       => $result['total'],
            'total_pages' => (int) max(1, ceil($result['total'] / $perPage)),
        ];
    }

    public function get(int $id): array
    {
        $card = $this->cardModel->find($id);
        if (!$card) {
            Response::error('Carta não encontrada.', 404);
        }
        return $this->decorate($card);
    }

    public function getImage(int $id): array
    {
        $image = $this->cardModel->findImage($id);
        if (!$image) {
            Response::error('Imagem não encontrada.', 404);
        }
        return $image;
    }

    public function create(array $data): array
    {
        $this->validate($data);
        $image = $this->extractImage($data);
        $id = $this->cardModel->create(array_merge($data, $image));
        return $this->get($id);
    }

    public function update(int $id, array $data): array
    {
        $this->get($id); // garante que existe (já responde 404 se não existir)
        $this->validate($data);
        $image = $this->extractImage($data);
        $this->cardModel->update($id, array_merge($data, $image));
        return $this->get($id);
    }

    public function delete(int $id): void
    {
        $this->get($id);
        $this->cardModel->delete($id);
    }

    // troca `has_image` (interno) por `image_url` (o que o front consome)
    private function decorate(array $card): array
    {
        $card['image_url'] = !empty($card['has_image']) ? "/cards/{$card['id']}/image" : null;
        unset($card['has_image']);
        return $card;
    }

    /**
     * O front manda `image_base64` como data URI (data:image/png;base64,....)
     * só quando o usuário escolheu um arquivo novo. Se não veio nada, mantém
     * a imagem que a carta já tinha (ver Card::update).
     */
    private function extractImage(array $data): array
    {
        if (empty($data['image_base64'])) {
            return ['image_mime' => null, 'image_data' => null];
        }

        if (!preg_match('/^data:(image\/[a-zA-Z]+);base64,(.+)$/', $data['image_base64'], $matches)) {
            Response::error('Formato de imagem inválido.', 422);
        }

        [, $mime, $base64] = $matches;

        if (!in_array($mime, self::ALLOWED_IMAGE_MIME, true)) {
            Response::error('Formato de imagem não suportado. Use JPG, PNG ou WEBP.', 415);
        }

        $binary = base64_decode($base64, true);
        if ($binary === false) {
            Response::error('Não foi possível processar a imagem enviada.', 422);
        }

        if (strlen($binary) > self::MAX_IMAGE_BYTES) {
            Response::error('Imagem muito grande (máximo 5MB).', 413);
        }

        return ['image_mime' => $mime, 'image_data' => $binary];
    }

    private function validate(array $data): void
    {
        $validator = new Validator();
        $validator
            ->required($data, 'name_en', 'Nome em inglês')
            ->maxLength($data, 'name_en', 150, 'Nome em inglês')
            ->maxLength($data, 'name_pt', 150, 'Nome em português')
            ->required($data, 'card_game', 'Card Game')
            ->in($data, 'card_game', self::GAMES, 'Card Game')
            ->required($data, 'edition_id', 'Edição')
            ->maxLength($data, 'edition_id', 50, 'Edição')
            ->required($data, 'edition_name', 'Edição')
            ->maxLength($data, 'edition_name', 150, 'Edição')
            ->required($data, 'rarity', 'Raridade')
            ->in($data, 'rarity', self::RARITIES, 'Raridade');

        if (!$validator->isValid()) {
            Response::error('Dados inválidos.', 422, $validator->getErrors());
        }
    }
}
