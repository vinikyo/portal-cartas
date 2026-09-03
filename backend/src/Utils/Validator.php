<?php

/**
 * Validator
 *
 * Validação simples de payloads. O front já valida antes de enviar,
 * mas o back-end SEMPRE valida de novo — nunca confiamos só no cliente.
 */
class Validator
{
    private array $errors = [];

    public function required(array $data, string $field, string $label): self
    {
        if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
            $this->errors[$field] = "$label é obrigatório.";
        }
        return $this;
    }

    public function in(array $data, string $field, array $allowed, string $label): self
    {
        if (isset($data[$field]) && !in_array($data[$field], $allowed, true)) {
            $this->errors[$field] = "$label inválido.";
        }
        return $this;
    }

    public function minLength(array $data, string $field, int $min, string $label): self
    {
        if (isset($data[$field]) && strlen((string) $data[$field]) < $min) {
            $this->errors[$field] = "$label deve ter pelo menos $min caracteres.";
        }
        return $this;
    }

    /**
     * mb_strlen (não strlen) porque conta caracteres, não bytes — mesma
     * lógica de contagem que o VARCHAR do MySQL usa, então o limite aqui
     * bate exatamente com o tamanho da coluna no banco.
     */
    public function maxLength(array $data, string $field, int $max, string $label): self
    {
        if (isset($data[$field]) && mb_strlen((string) $data[$field]) > $max) {
            $this->errors[$field] = "$label deve ter no máximo $max caracteres.";
        }
        return $this;
    }

    public function isValid(): bool
    {
        return empty($this->errors);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
