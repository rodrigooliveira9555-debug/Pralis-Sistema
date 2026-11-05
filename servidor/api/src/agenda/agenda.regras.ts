// Agenda — tipo de arquivo pelo conteúdo (não pelo que o navegador diz): só formatos de documento e
// imagem. HTML, SVG, scripts e executáveis são recusados (um arquivo aberto no site não pode virar
// página que roda código).

type Detectado = { tipo: string; extensoes: string[] };

const comeca = (b: Buffer, bytes: number[], deslocamento = 0) => bytes.every((x, i) => b[deslocamento + i] === x);
const ascii = (b: Buffer, ini: number, fim: number) => b.subarray(ini, fim).toString("latin1");

const OFFICE_ZIP: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};
const OFFICE_ANTIGO: Record<string, string> = { doc: "application/msword", xls: "application/vnd.ms-excel", ppt: "application/vnd.ms-powerpoint" };
const TEXTO: Record<string, string> = { txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8" };

export const extensaoDe = (nome: string) => (/\.([a-z0-9]{1,8})$/i.exec(nome)?.[1] ?? "").toLowerCase();

/** Tipo (MIME) aceito para o arquivo, ou null quando o formato não é permitido. */
export function tipoDoArquivo(conteudo: Buffer, nome: string): string | null {
  const ext = extensaoDe(nome);
  const d = detectar(conteudo, ext);
  if (!d) return null;
  return d.extensoes.length && !d.extensoes.includes(ext) ? null : d.tipo;
}

function detectar(b: Buffer, ext: string): Detectado | null {
  if (b.length < 4) return null;
  if (comeca(b, [0x89, 0x50, 0x4e, 0x47])) return { tipo: "image/png", extensoes: ["png"] };
  if (comeca(b, [0xff, 0xd8, 0xff])) return { tipo: "image/jpeg", extensoes: ["jpg", "jpeg"] };
  if (ascii(b, 0, 4) === "GIF8") return { tipo: "image/gif", extensoes: ["gif"] };
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return { tipo: "image/webp", extensoes: ["webp"] };
  if (ascii(b, 4, 8) === "ftyp" && /^(heic|heix|mif1|msf1|hevc)$/.test(ascii(b, 8, 12))) return { tipo: "image/heic", extensoes: ["heic", "heif"] };
  if (ascii(b, 0, 5) === "%PDF-") return { tipo: "application/pdf", extensoes: ["pdf"] };
  if (comeca(b, [0x50, 0x4b, 0x03, 0x04]) && OFFICE_ZIP[ext]) return { tipo: OFFICE_ZIP[ext]!, extensoes: [ext] };
  if (comeca(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && OFFICE_ANTIGO[ext]) return { tipo: OFFICE_ANTIGO[ext]!, extensoes: [ext] };
  if (TEXTO[ext] && textoSimples(b)) return { tipo: TEXTO[ext]!, extensoes: [ext] };
  return null;
}

/** Texto: UTF-8 válido, sem byte zero e sem começar como página (HTML/SVG). */
function textoSimples(b: Buffer): boolean {
  const inicio = b.subarray(0, 8192);
  if (inicio.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    return false;
  }
  return !/^\s*<(?:!doctype|html|svg|script|\?xml)/i.test(inicio.toString("utf8"));
}

/** Imagem e PDF abrem no navegador; o resto sempre baixa. */
export const abreNoNavegador = (tipo: string) => tipo.startsWith("image/") && tipo !== "image/heic";

/** Content-Disposition com o nome do arquivo (ASCII de reserva + UTF-8). */
export function disposicao(nome: string, inline: boolean) {
  const reserva = nome.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "arquivo";
  return `${inline ? "inline" : "attachment"}; filename="${reserva}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}
