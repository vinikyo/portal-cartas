<?php

/**
 * CardService
 *
 * Regra de negócio do CRUD de cartas: valida o payload (espelhando a
 * validação do front) e delega a persistência para o Model.
 */
class CardService
{
    private Card $cardModel;

    public const GAMES  = ['magic', 'pokemon', 'yugioh'];
    public const RARITIES = ['common', 'uncommon', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'];

    public function __construct()
    {
        $this->cardModel = new Card();
    }

    public function list(): array
    {
        return $this->cardModel->all();
    }

    public function get(int $id): array
    {
        $card = $this->cardModel->find($id);
        if (!$card) {
            Response::error('Carta não encontrada.', 404);
        }
        return $card;
    }

    public function create(array $data): array
    {
        $this->validate($data);
        $id = $this->cardModel->create($data);
        return $this->cardModel->find($id);
    }

    public function update(int $id, array $data): array
    {
        $this->get($id); // garante que existe (já responde 404 se não existir)
        $this->validate($data);
        $this->cardModel->update($id, $data);
        return $this->cardModel->find($id);
    }

    public function delete(int $id): void
    {
        $this->get($id);
        $this->cardModel->delete($id);
    }

    private function validate(array $data): void
    {
        $validator = new Validator();
        $validator
            ->required($data, 'name_en', 'Nome em inglês')
            ->required($data, 'card_game', 'Card Game')
            ->in($data, 'card_game', self::GAMES, 'Card Game')
            ->required($data, 'edition_id', 'Edição')
            ->required($data, 'edition_name', 'Edição')
            ->required($data, 'rarity', 'Raridade')
            ->in($data, 'rarity', self::RARITIES, 'Raridade');

        if (!$validator->isValid()) {
            Response::error('Dados inválidos.', 422, $validator->getErrors());
        }
    }
}
