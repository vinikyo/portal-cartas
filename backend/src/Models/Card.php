<?php

/**
 * Card (Model)
 *
 * Acesso direto à tabela `cards`. A imagem é salva como blob dentro do
 * próprio banco (image_mime/image_data) — por isso as queries de listagem
 * nunca trazem o blob (pesado), só um campo calculado `has_image`; o blob
 * só é buscado sob demanda em findImage().
 */
class Card
{
    private PDO $db;

    private const LIST_COLUMNS = "id, name_en, name_pt, card_game, edition_id, edition_name, rarity,
        (image_data IS NOT NULL) AS has_image, created_at, updated_at";

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Lista paginada e filtrada. $filters aceita as chaves game, rarity, search.
     * Retorna ['items' => [...], 'total' => int].
     */
    public function paginate(array $filters, int $page, int $perPage): array
    {
        [$where, $params] = $this->buildWhere($filters);
        $offset = ($page - 1) * $perPage;

        $sql = 'SELECT ' . self::LIST_COLUMNS . " FROM cards $where ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll();

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM cards $where");
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        return ['items' => $items, 'total' => $total];
    }

    private function buildWhere(array $filters): array
    {
        $clauses = [];
        $params = [];

        if (!empty($filters['game'])) {
            $clauses[] = 'card_game = :game';
            $params[':game'] = $filters['game'];
        }
        if (!empty($filters['rarity'])) {
            $clauses[] = 'rarity = :rarity';
            $params[':rarity'] = $filters['rarity'];
        }
        if (!empty($filters['search'])) {
            $clauses[] = '(name_en LIKE :search OR name_pt LIKE :search OR edition_name LIKE :search)';
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        $where = $clauses ? 'WHERE ' . implode(' AND ', $clauses) : '';
        return [$where, $params];
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT ' . self::LIST_COLUMNS . ' FROM cards WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $card = $stmt->fetch();

        return $card ?: null;
    }

    /** Retorna ['image_mime' => ..., 'image_data' => ...] ou null se a carta não tem imagem. */
    public function findImage(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT image_mime, image_data FROM cards WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        if (!$row || $row['image_data'] === null) {
            return null;
        }

        return $row;
    }

    public function create(array $data): int
    {
        $sql = 'INSERT INTO cards
                (name_en, name_pt, card_game, edition_id, edition_name, rarity, image_mime, image_data, created_at, updated_at)
                VALUES
                (:name_en, :name_pt, :card_game, :edition_id, :edition_name, :rarity, :image_mime, :image_data, NOW(6), NOW(6))';

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':name_en', $data['name_en']);
        $stmt->bindValue(':name_pt', $data['name_pt'] ?? null);
        $stmt->bindValue(':card_game', $data['card_game']);
        $stmt->bindValue(':edition_id', $data['edition_id']);
        $stmt->bindValue(':edition_name', $data['edition_name']);
        $stmt->bindValue(':rarity', $data['rarity']);
        $stmt->bindValue(':image_mime', $data['image_mime'] ?? null);
        $this->bindImage($stmt, ':image_data', $data['image_data'] ?? null);
        $stmt->execute();

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $sql = 'UPDATE cards SET
                    name_en = :name_en,
                    name_pt = :name_pt,
                    card_game = :card_game,
                    edition_id = :edition_id,
                    edition_name = :edition_name,
                    rarity = :rarity';

        // Em edição, imagem tem três estados: manter (sem campo), substituir
        // (image_update + novos bytes) ou remover (remove_image=true).
        $imageUpdate = !empty($data['image_update']);
        if ($imageUpdate) {
            $sql .= ', image_mime = :image_mime, image_data = :image_data';
        }

        $sql .= ', updated_at = NOW(6) WHERE id = :id';

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':name_en', $data['name_en']);
        $stmt->bindValue(':name_pt', $data['name_pt'] ?? null);
        $stmt->bindValue(':card_game', $data['card_game']);
        $stmt->bindValue(':edition_id', $data['edition_id']);
        $stmt->bindValue(':edition_name', $data['edition_name']);
        $stmt->bindValue(':rarity', $data['rarity']);

        if ($imageUpdate) {
            $mime = !empty($data['remove_image']) ? null : ($data['image_mime'] ?? null);
            $binary = !empty($data['remove_image']) ? null : ($data['image_data'] ?? null);
            $stmt->bindValue(':image_mime', $mime);
            $this->bindImage($stmt, ':image_data', $binary);
        }

        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        // updated_at muda a cada UPDATE, então rowCount() continua distinguindo
        // um registro existente de um id inexistente mesmo quando os dados não mudaram.
        return $stmt->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM cards WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    private function bindImage(PDOStatement $stmt, string $param, ?string $binary): void
    {
        if ($binary === null) {
            $stmt->bindValue($param, null, PDO::PARAM_NULL);
        } else {
            $stmt->bindValue($param, $binary, PDO::PARAM_LOB);
        }
    }
}
