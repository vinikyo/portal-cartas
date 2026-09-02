<?php

/**
 * UploadController
 *
 * Recebe um arquivo de imagem via multipart/form-data, valida tipo e
 * tamanho, salva em public/uploads com um nome único e devolve a URL
 * pública. O front usa essa URL como `image_url` do cadastro da carta.
 */
class UploadController
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function store(): void
    {
        $this->authService->requireAuth();

        if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Envie um arquivo de imagem válido.', 422);
        }

        $file = $_FILES['image'];

        if ($file['size'] > MAX_UPLOAD_SIZE_BYTES) {
            Response::error('Imagem muito grande (máximo 5MB).', 422);
        }

        $mimeType = mime_content_type($file['tmp_name']);
        if (!in_array($mimeType, ALLOWED_UPLOAD_MIME_TYPES, true)) {
            Response::error('Formato de imagem não suportado. Use JPG, PNG ou WEBP.', 422);
        }

        if (!is_dir(UPLOADS_DIR)) {
            mkdir(UPLOADS_DIR, 0755, true);
        }

        $extension = match ($mimeType) {
            'image/png'  => 'png',
            'image/webp' => 'webp',
            default      => 'jpg',
        };

        $filename = uniqid('card_', true) . '.' . $extension;
        $destination = UPLOADS_DIR . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::error('Falha ao salvar a imagem.', 500);
        }

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $url = "$scheme://$host/uploads/$filename";

        Response::success(['url' => $url], 201);
    }
}
