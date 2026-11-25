import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Asset } from '../types';

/**
 * Draw a rounded rectangle path on canvas
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Truncate text to fit within max width on canvas
 */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Generate a high-resolution label canvas exactly matching 5 cm x 3 cm (5:3 ratio):
 * - Compact layout: NO wasted whitespace
 * - Canvas resolution: 850 x 510 px (exact 5:3 ratio, crisp 430 DPI)
 * - Header: PROPERTI / ASET + Organization Name + ASET TETAP badge
 * - Solid separator line
 * - Left: Large QR code filling the vertical body space
 * - Right: KODE ASET, NAMA BARANG, Merek & Sumber Dana, Lokasi
 * - Dashed separator line
 * - Footer: DILARANG MELEPAS / MERUSAK LABEL INI + TGL: YYYY-MM-DD
 */
export async function generateAssetLabelCanvas(
  asset: Asset,
  orgName: string = 'SMK NW ANJANI',
  orgCode: string = 'INV'
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  // 850 x 510 px (exact 5:3 ratio for 5 cm x 3 cm)
  const width = 850;
  const height = 510;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get 2d context for label generator');

  // 1. Fill canvas background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Outer card container with clean dark navy border
  const cardX = 12;
  const cardY = 12;
  const cardW = width - 24;
  const cardH = height - 24;
  const cardR = 20;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();

  ctx.lineWidth = 4.5;
  ctx.strokeStyle = '#0F172A'; // deep slate / navy
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.stroke();

  const padX = cardX + 22;
  const padR = cardX + cardW - 22;

  // 3. Header Section (Compact, zero wasted space)
  // 3a. Subtitle: PROPERTI / ASET
  ctx.font = 'bold 13.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('PROPERTI / ASET', padX, cardY + 32);

  // 3b. Organization Name
  ctx.font = '900 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  const orgTitle = truncateText(ctx, (orgName || 'SMK NW ANJANI').toUpperCase(), 520);
  ctx.fillText(orgTitle, padX, cardY + 62);

  // 3c. Asset Type Badge on top right: [ ASET TETAP ] or [ HABIS PAKAI ]
  const badgeText = asset.type === 'fixed_asset' ? 'ASET TETAP' : 'HABIS PAKAI';
  ctx.font = 'bold 12.5px "Plus Jakarta Sans", Arial, sans-serif';
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const badgeW = badgeTextWidth + 24;
  const badgeH = 32;
  const badgeX = padR - badgeW;
  const badgeY = cardY + 28;

  ctx.fillStyle = '#F8FAFC';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 7);
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#CBD5E1';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 7);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 21);

  // 4. Solid Horizontal Line below Header
  ctx.beginPath();
  ctx.moveTo(padX, cardY + 80);
  ctx.lineTo(padR, cardY + 80);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#0F172A';
  ctx.stroke();

  // 5. Generate and draw QR Code (Left)
  // QR code takes almost full body height to eliminate vertical gaps!
  const qrPayload = JSON.stringify({
    org: orgCode || 'INV',
    code: asset.itemCode,
    name: asset.name,
    dana: asset.fundingSource || '-'
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 340,
    margin: 1,
    color: {
      dark: '#0B1930',
      light: '#FFFFFF'
    }
  });

  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  // QR box
  const qrBoxX = padX;
  const qrBoxY = cardY + 98;
  const qrBoxSize = 314;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#CBD5E1';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
  ctx.stroke();

  // Draw QR Image inside container with minimal margin
  ctx.drawImage(qrImg, qrBoxX + 10, qrBoxY + 10, qrBoxSize - 20, qrBoxSize - 20);

  // 6. Right Side Asset Details (Tight, readable, zero dead space)
  const contentX = qrBoxX + qrBoxSize + 24;
  const maxContentW = padR - contentX;

  // 6a. KODE ASET
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('KODE ASET:', contentX, cardY + 124);

  ctx.font = '900 30px "Courier New", monospace, sans-serif';
  ctx.fillStyle = '#0F172A';
  const itemCodeText = truncateText(ctx, asset.itemCode, maxContentW);
  ctx.fillText(itemCodeText, contentX, cardY + 158);

  // 6b. NAMA BARANG
  ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('NAMA BARANG:', contentX, cardY + 204);

  ctx.font = 'bold 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  const nameText = truncateText(ctx, asset.name, maxContentW);
  ctx.fillText(nameText, contentX, cardY + 236);

  // 6c. Merek and Sumber Dana row
  const row1Y = cardY + 292;
  ctx.font = 'bold 16.5px "Plus Jakarta Sans", Arial, sans-serif';

  // Left col: Merek
  ctx.fillStyle = '#64748B';
  ctx.fillText('Merek: ', contentX, row1Y);
  const brandLabelW = ctx.measureText('Merek: ').width;
  ctx.fillStyle = '#1E293B';
  const brandVal = truncateText(ctx, asset.brand || '-', 190);
  ctx.fillText(brandVal, contentX + brandLabelW, row1Y);

  // Right col: Sumber Dana
  const col2X = contentX + 225;
  ctx.fillStyle = '#64748B';
  ctx.fillText('Sumber Dana: ', col2X, row1Y);
  const fundLabelW = ctx.measureText('Sumber Dana: ').width;
  ctx.fillStyle = '#1E293B';
  const fundVal = truncateText(ctx, asset.fundingSource || 'Operasional', maxContentW - (col2X - contentX + fundLabelW));
  ctx.fillText(fundVal, col2X + fundLabelW, row1Y);

  // 6d. Lokasi row
  const row2Y = cardY + 338;
  ctx.fillStyle = '#64748B';
  ctx.fillText('Lokasi: ', contentX, row2Y);
  const locLabelW = ctx.measureText('Lokasi: ').width;
  ctx.fillStyle = '#1E293B';
  const locVal = truncateText(ctx, asset.locationName || '-', maxContentW - locLabelW);
  ctx.fillText(locVal, contentX + locLabelW, row2Y);

  // 7. Dashed Separator Line
  ctx.beginPath();
  ctx.setLineDash([7, 5]);
  ctx.moveTo(padX, cardY + cardH - 52);
  ctx.lineTo(padR, cardY + cardH - 52);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#CBD5E1';
  ctx.stroke();
  ctx.setLineDash([]); // reset dash

  // 8. Footer Section
  const footerY = cardY + cardH - 20;

  // Left warning note
  ctx.font = 'bold 12.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'left';
  ctx.fillText('DILARANG MELEPAS / MERUSAK LABEL INI', padX, footerY);

  // Right date
  ctx.textAlign = 'right';
  const displayDate = asset.purchaseDate || new Date().toISOString().substring(0, 10);
  ctx.fillText(`TGL: ${displayDate}`, padR, footerY);

  return canvas;
}

/**
 * Trigger immediate single file download in browser
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Download single asset label card image as PNG or JPG (Exact 5 cm x 3 cm aspect ratio)
 */
export async function downloadAssetLabelImage(
  asset: Asset,
  orgName: string,
  orgCode: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const canvas = await generateAssetLabelCanvas(asset, orgName, orgCode);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';
  const filename = `Label_5x3cm_${asset.itemCode.replace(/[/\\?%*:|"<>]/g, '_')}.${extension}`;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }
        triggerBrowserDownload(blob, filename);
        resolve();
      },
      mimeType,
      0.95
    );
  });
}

/**
 * Download ALL asset labels at once as separate JPG/PNG files inside a single ZIP file
 */
export async function downloadBulkAssetLabelsZip(
  assets: Asset[],
  orgName: string,
  orgCode: string,
  format: 'png' | 'jpeg' = 'png',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (assets.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder(`Label_5x3cm_${orgCode || 'INV'}_${format.toUpperCase()}`);
  const targetFolder = folder || zip;

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';

  let current = 0;
  for (const asset of assets) {
    try {
      const canvas = await generateAssetLabelCanvas(asset, orgName, orgCode);
      const dataUrl = canvas.toDataURL(mimeType, 0.95);
      const base64Data = dataUrl.split(',')[1];
      const filename = `Label_5x3cm_${asset.itemCode.replace(/[/\\?%*:|"<>]/g, '_')}.${extension}`;

      targetFolder.file(filename, base64Data, { base64: true });
    } catch (err) {
      console.error(`Failed to generate label for ${asset.itemCode}:`, err);
    }
    current++;
    if (onProgress) {
      onProgress(current, assets.length);
    }
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const zipFilename = `Label_Inventaris_5x3cm_${orgCode || 'INV'}_${assets.length}Barang_${format.toUpperCase()}.zip`;
  triggerBrowserDownload(zipBlob, zipFilename);
}
