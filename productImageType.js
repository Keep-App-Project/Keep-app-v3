export function productImageType(buffer) {
  const bytes = new Uint8Array(buffer);
  const matches = (signature) => signature.every((byte, index) => bytes[index] === byte);
  if (matches([0xff, 0xd8, 0xff])) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: 'png', contentType: 'image/png' };
  }
  throw new Error('Use uma foto no formato JPG ou PNG.');
}
