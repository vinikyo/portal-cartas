<?php

/**
 * Card (Model)
 *
 * CRUD puro na tabela `cards`. Nenhuma validação de negócio aqui,
 * isso é responsabilidade do CardService.
 */
class Card
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function all(): array
    {
        $stmt = $this->db->query('SELECT * FROM cards ORDER BY created_at DESC');
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM cards WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $card = $stmt->fetch();

        return $card ?: null;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO cards
                (name_en, name_pt, card_game, edition_id, edition_name, image_url, rarity, created_at, updated_at)
                VALUES
                (:name_en, :name_pt, :card_game, :edition_id, :edition_name, :image_url, :rarity, NOW(), NOW())';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name_en'      => $data['name_en'],
            'name_pt'      => $data['name_pt'] ?? null,
            'card_game'    => $data['card_game'],
            'edition_id'   => $data['edition_id'],
            'edition_name' => $data['edition_name'],
            'image_url'    => $data['image_url'] ?? null,
            'rarity'       => $data['rarity'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $sql = 'UPDATE cards SET
                    name_en = :name_en,
                    name_pt = :name_pt,
                    card_game = :card_game,
                    edition_id = :edition_id,
                    edition_name = :edition_name,
                    image_url = :image_url,
                    rarity = :rarity,
                    updated_at = NOW()
                WHERE id = :id';

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name_en'      => $data['name_en'],
            'name_pt'      => $data['name_pt'] ?? null,
            'card_game'    => $data['card_game'],
            'edition_id'   => $data['edition_id'],
            'edition_name' => $data['edition_name'],
            'image_url'    => $data['image_url'] ?? null,
            'rarity'       => $data['rarity'],
            'id'           => $id,
        ]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM cards WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}
