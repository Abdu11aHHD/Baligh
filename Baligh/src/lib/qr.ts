import "server-only";
import QRCode from "qrcode";

const INK = "#3F178F";
const PAPER = "#FFFFFF";

/** Error correction "Q" (25%) survives scuffed or partially covered printed posters. */
const base = { errorCorrectionLevel: "Q" as const, margin: 2, color: { dark: INK, light: PAPER } };

export function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...base, type: "svg" });
}

export function renderQrPng(url: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...base, type: "png", width });
}

export async function renderQrDataUrl(url: string, width = 480): Promise<string> {
  return QRCode.toDataURL(url, { ...base, width });
}
