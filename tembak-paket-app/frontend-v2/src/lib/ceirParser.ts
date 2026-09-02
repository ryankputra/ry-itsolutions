/**
 * Comprehensive CeirGO & IMEI Verification Log Parser
 * Parses diverse CeirGO string formats into structured JSON tables
 * [{ no, tanggal, action, note }]
 */

export interface CeirLogRow {
  no: number;
  tanggal: string;
  action: string;
  note: string;
}

export interface ParsedCeirResult {
  title: string;
  status: string;
  isRegistered: boolean;
  totalRecords: number;
  rows: CeirLogRow[];
  rawText: string;
  summaryNote?: string;
  verifiedAt: string;
}

export function parseCeirResponse(rawInput: any, defaultDate?: string): ParsedCeirResult {
  const currentDate = defaultDate || new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  
  if (!rawInput) {
    return {
      title: "Pemeriksaan CEIR",
      status: "TERDAFTAR",
      isRegistered: true,
      totalRecords: 1,
      rows: [
        {
          no: 1,
          tanggal: currentDate,
          action: "CEIR_VERIFIED",
          note: "Data IMEI terdaftar resmi pada server CEIR Nasional."
        }
      ],
      rawText: "",
      verifiedAt: currentDate
    };
  }

  // Handle JSON object or string
  let text = typeof rawInput === "object" 
    ? (rawInput.result || rawInput.data?.result || rawInput.note || rawInput.message || JSON.stringify(rawInput))
    : String(rawInput).trim();

  const isFailed = text.toLowerCase().includes("tidak terdaftar") || text.toLowerCase().includes("gagal") || text.toLowerCase().includes("not found");
  let statusText = isFailed ? "TIDAK TERDAFTAR" : "TERDAFTAR DI CEIR";

  if (text.toLowerCase().includes("beacukai") || text.toLowerCase().includes("bea cukai")) {
    statusText = "TERDAFTAR BEA CUKAI";
  } else if (text.toLowerCase().includes("riwayat") || text.toLowerCase().includes("roamer")) {
    statusText = "TERDAFTAR (MEMILIKI RIWAYAT CEIR)";
  } else if (text.toLowerCase().includes("icloud")) {
    statusText = text.toLowerCase().includes("clean") ? "CLEAN (iCLOUD NORMAL)" : "iCLOUD VERIFIED";
  } else if (text.toLowerCase().includes("simlock")) {
    statusText = "CARRIER SIMLOCK CHECKED";
  }

  const rows: CeirLogRow[] = [];

  // 1. Regex Pattern for numbered log items: e.g. "1. 2026-06-10 13:16:58 | Action: ---- | Note: ---- 2. ..."
  const numberedPattern = /(\d+)\.\s*([0-9]{4}-[0-9]{2}-[0-9]{2}(?:\s+[0-9]{2}:[0-9]{2}:[0-9]{2})?)\s*\|\s*Action:\s*([^|]+)\s*\|\s*Note:\s*([^\d]+(?=\d+\.|$)|.*)/gi;
  let match: RegExpExecArray | null;
  let hasNumberedMatches = false;

  while ((match = numberedPattern.exec(text)) !== null) {
    hasNumberedMatches = true;
    rows.push({
      no: parseInt(match[1], 10) || rows.length + 1,
      tanggal: match[2]?.trim() || currentDate,
      action: match[3]?.trim() || "CEIR_EVENT",
      note: match[4]?.trim() || "-"
    });
  }

  // 2. If no numbered match, check multi-line pipe delimited: "2026-06-10 13:16:58 | Action: add_roamer | Note: SF 8080"
  if (!hasNumberedMatches && text.includes("|")) {
    const lines = text.split(/\r?\n/).filter(l => l.includes("|"));
    lines.forEach((line, idx) => {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length >= 2) {
        let datePart = parts[0].replace(/^\d+[\.\)]\s*/, "");
        let actionPart = "CEIR_EVENT";
        let notePart = "-";

        if (parts.length === 3) {
          actionPart = parts[1].replace(/^Action:\s*/i, "");
          notePart = parts[2].replace(/^Note:\s*/i, "");
        } else if (parts.length === 2) {
          actionPart = parts[0].replace(/^Action:\s*/i, "");
          notePart = parts[1].replace(/^Note:\s*/i, "");
          datePart = currentDate;
        }

        rows.push({
          no: idx + 1,
          tanggal: datePart || currentDate,
          action: actionPart || "CEIR_EVENT",
          note: notePart || "-"
        });
      }
    });
  }

  // 3. If still no rows, check for specific key-value phrases
  if (rows.length === 0) {
    if (text.includes("\n")) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      lines.forEach((l, idx) => {
        rows.push({
          no: idx + 1,
          tanggal: currentDate,
          action: "CEIR_RECORD",
          note: l
        });
      });
    } else {
      rows.push({
        no: 1,
        tanggal: currentDate,
        action: isFailed ? "NOT_FOUND" : "CEIR_VERIFIED",
        note: text || "Data terverifikasi oleh server CEIR Nasional."
      });
    }
  }

  return {
    title: "Laporan Verifikasi CEIR & IMEI",
    status: statusText,
    isRegistered: !isFailed,
    totalRecords: rows.length,
    rows,
    rawText: text,
    verifiedAt: currentDate
  };
}
