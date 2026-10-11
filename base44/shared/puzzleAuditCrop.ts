import jpeg from 'npm:jpeg-js@0.4.4';

/** Present only the measured object, original left and edited right, to the verifier. */
export async function puzzleAuditCrop(base44, first, second, at) {
  const x = Math.max(0, Math.floor(at.x * first.width));
  const y = Math.max(0, Math.floor(at.y * first.height));
  const width = Math.min(first.width - x, Math.ceil(at.w * first.width));
  const height = Math.min(first.height - y, Math.ceil(at.h * first.height));
  const data = new Uint8Array(width * 2 * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let side = 0; side < 2; side += 1) {
      const picture = side === 0 ? first : second;
      const offset = ((y + row) * picture.width + x) * 4;
      data.set(picture.data.subarray(offset, offset + width * 4), (row * width * 2 + side * width) * 4);
    }
  }
  const encoded = jpeg.encode({ width: width * 2, height, data }, 90);
  const file = new File([encoded.data], 'puzzle-comparison.jpg', { type: 'image/jpeg' });
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
  return file_url;
}