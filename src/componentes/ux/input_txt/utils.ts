// padrão do projeto: sem acentos, sem caracteres especiais,
// espaço único entre palavras e CAIXA ALTA
export function sanitizeTxt(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "")
    .toUpperCase();
}
