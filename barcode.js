// Tipos aceitos pela API de câmera do Expo SDK 58.
export const BARCODE_TYPES = [
  'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39',
  'code93', 'itf14', 'codabar',
];

// Não convertemos para número: zeros no começo de EAN/UPC são significativos.
export function normalizeBarcode(value) {
  const code = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  return /^[0-9A-Za-z-]{4,64}$/.test(code) ? code : null;
}
