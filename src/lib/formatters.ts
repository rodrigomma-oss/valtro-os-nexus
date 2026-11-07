/**
 * Formatadores compartilhados da plataforma Valtro Labs.
 *
 * Convenção geral:
 * - No banco de dados, telefones são armazenados apenas com dígitos.
 * - Na interface, sempre exibimos a versão formatada via `formatPhone`.
 * - No input de cadastro/edição, usamos `maskPhoneInput` para máscara em
 *   tempo real (aceita colar com ou sem máscara).
 */

/** Remove qualquer caractere que não seja dígito. */
export function onlyDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D+/g, "");
}

/**
 * Formata um telefone brasileiro para exibição.
 * - 11 dígitos → (83) 99999-9999 (celular)
 * - 10 dígitos → (83) 3333-3333 (fixo)
 * - Comprimento não reconhecido → retorna a entrada original (útil para
 *   dados legados).
 *
 * Aceita entrada com ou sem máscara; nunca lança erro.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

/**
 * Máscara progressiva para uso em `onChange` de inputs.
 * Aceita colar valores com ou sem máscara e limita a 11 dígitos.
 * Retorna a string parcialmente formatada conforme o usuário digita.
 */
export function maskPhoneInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
