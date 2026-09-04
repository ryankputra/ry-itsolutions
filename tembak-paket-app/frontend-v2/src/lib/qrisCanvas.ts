import QRCode from "qrcode";

export interface QrisCanvasOptions {
  logoUrl?: string;
  width?: number;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Sanitizes and validates a raw QRIS payload string
 */
export function sanitizeQrisPayload(raw: string): string {
  if (!raw) return "";
  // If it's already a Data URL or URL, return as is
  if (raw.startsWith("data:image/") || raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  // Strip surrounding quotes and whitespace/newlines
  return String(raw)
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

/**
 * Generates an ultra-crisp, scan-ready QRIS PNG Base64 Data URL
 * with Error Correction Level 'H' (30% recovery), margin 4,
 * and a centered logo overlay on a white background pad (~20-22% size).
 */
export async function generateQrisCanvasDataUrl(
  payload: string,
  options: QrisCanvasOptions = {}
): Promise<string> {
  if (typeof window === "undefined") return "";

  const cleanPayload = (payload || "").trim();
  if (!cleanPayload) return "";

  // If payload is already a data URL and not an EMVCo string, return it as preview
  if (cleanPayload.startsWith("data:image/")) {
    return cleanPayload;
  }

  const canvasWidth = options.width || 512;
  const margin = typeof options.margin === "number" ? options.margin : 4;
  const errorCorrectionLevel = options.errorCorrectionLevel || "H";
  const logoUrl = options.logoUrl || "/logo.png";

  // 1. Create an offscreen HTML5 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasWidth;

  // 2. Render base QR Code on Canvas with High Error Correction
  await QRCode.toCanvas(canvas, cleanPayload, {
    errorCorrectionLevel,
    margin,
    width: canvasWidth,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas.toDataURL("image/png");
  }

  // 3. Calculate Center White Pad Dimensions (~20-22% of total canvas width)
  const padRatio = 0.22;
  const padSize = Math.round(canvasWidth * padRatio);
  const padX = Math.round((canvasWidth - padSize) / 2);
  const padY = Math.round((canvasWidth - padSize) / 2);
  const padRadius = Math.round(padSize * 0.18);

  // 4. Draw White Background Pad with rounded corners & subtle shadow/border
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(padX, padY, padSize, padSize, padRadius);
  } else {
    ctx.rect(padX, padY, padSize, padSize);
  }
  ctx.fill();
  ctx.restore();

  // Draw clean hairline border for contrast separation
  ctx.save();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(padX, padY, padSize, padSize, padRadius);
  } else {
    ctx.rect(padX, padY, padSize, padSize);
  }
  ctx.stroke();
  ctx.restore();

  // 5. Draw Merchant / QRIS Logo inside the White Pad
  const loadLogo = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 2500);

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(img);
        }
      };

      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      };

      img.src = src;
    });
  };

  let logoImg = await loadLogo(logoUrl);
  if (!logoImg && logoUrl !== "/payments/qris.png") {
    // Fallback to /payments/qris.png if /logo.png failed
    logoImg = await loadLogo("/payments/qris.png");
  }

  if (logoImg && logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
    const innerPadding = Math.round(padSize * 0.14);
    const maxLogoW = padSize - innerPadding * 2;
    const maxLogoH = padSize - innerPadding * 2;

    const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
    let drawW = maxLogoW;
    let drawH = maxLogoH;

    if (aspect > 1) {
      drawH = maxLogoW / aspect;
    } else {
      drawW = maxLogoH * aspect;
    }

    const drawX = padX + (padSize - drawW) / 2;
    const drawY = padY + (padSize - drawH) / 2;

    ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
  } else {
    // Graceful fallback: Draw crisp official "QRIS" badge on white pad
    ctx.save();
    ctx.font = `bold ${Math.round(padSize * 0.32)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e11d48"; // QRIS red
    ctx.fillText("QRIS", canvasWidth / 2, canvasWidth / 2);
    ctx.restore();
  }

  // 6. Return Base64 PNG Data URL
  return canvas.toDataURL("image/png");
}
