export interface PixPayloadOptions {
  key: string;
  name?: string;
  city?: string;
  amount?: number;
  txid?: string;
}

export const DEFAULT_PIX_KEY = 'gutenberg23@gmail.com';
export const DEFAULT_PIX_RECEIVER = 'Iasmin e Gutenberg';
export const DEFAULT_PIX_CITY = 'Rio de Janeiro';

/**
 * Generates official EMV BR Code (Pix Copia e Cola) standard from Central Bank of Brazil
 */
export function generatePixPayload({
  key = DEFAULT_PIX_KEY,
  name = DEFAULT_PIX_RECEIVER,
  city = DEFAULT_PIX_CITY,
  amount,
  txid = '***'
}: PixPayloadOptions): string {
  const cleanName = (name || DEFAULT_PIX_RECEIVER)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 25);
  const cleanCity = (city || DEFAULT_PIX_CITY)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 15);
  const cleanKey = key || DEFAULT_PIX_KEY;
  const cleanTxid = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  const formatField = (id: string, value: string) => {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const merchantAccountInfo =
    formatField('00', 'br.gov.bcb.pix') +
    formatField('01', cleanKey);

  let payload =
    formatField('00', '01') +
    formatField('26', merchantAccountInfo) +
    formatField('52', '0000') +
    formatField('53', '986');

  if (amount && amount > 0) {
    const formattedAmount = Number(amount).toFixed(2);
    payload += formatField('54', formattedAmount);
  }

  payload +=
    formatField('58', 'BR') +
    formatField('59', cleanName) +
    formatField('60', cleanCity) +
    formatField('62', formatField('05', cleanTxid)) +
    '6304';

  // CRC16-CCITT (0x1021)
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  return payload + crcHex;
}

export function getPixQrCodeUrl(pixCode: string, size = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(pixCode)}`;
}
