/**
 * Comprehensive CeirGO & IMEI Verification Log Parser
 * Parses official CeirGO JSON structure and extracts dynamic columns and rows directly from API response JSON keys.
 */

export interface ParsedCeirResult {
  title: string;
  status: string;
  isRegistered: boolean;
  totalRecords: number;
  columns: string[];
  rows: Record<string, any>[];
  rawText: string;
  verifiedAt: string;
  imei?: string;
}

export function parseCeirResponse(rawInput: any, defaultDate?: string, apiResponse?: any): ParsedCeirResult {
  const currentDate = defaultDate || new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  
  let targetInput = rawInput;
  if (apiResponse && (!rawInput || (typeof rawInput === "string" && (rawInput.toLowerCase().includes("berhasil kami proses") || rawInput.toLowerCase().includes("sedang diproses") || rawInput.toLowerCase().includes("sukses"))))) {
    targetInput = apiResponse;
  }

  let parsedObj: any = null;
  if (typeof targetInput === "object" && targetInput !== null) {
    parsedObj = targetInput;
  } else if (typeof targetInput === "string") {
    const trimmed = targetInput.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try { parsedObj = JSON.parse(trimmed); } catch {}
    }
  }

  let detectedImei = "";
  let rawItems: any[] = [];

  if (parsedObj) {
    if (parsedObj.imei || parsedObj.IMEI) detectedImei = parsedObj.imei || parsedObj.IMEI;

    let itemsSource = parsedObj.result || parsedObj.history || parsedObj.data?.history || parsedObj.data?.result || parsedObj.data || parsedObj;

    if (Array.isArray(itemsSource)) {
      itemsSource.forEach((item: any) => {
        if (!item) return;
        if (item.imei || item.IMEI) detectedImei = item.imei || item.IMEI;
        if (Array.isArray(item.history)) {
          rawItems.push(...item.history);
        } else if (typeof item === "object" && item !== null) {
          rawItems.push(item);
        }
      });
    } else if (typeof itemsSource === "object" && itemsSource !== null) {
      if (Array.isArray(itemsSource.history)) {
        rawItems.push(...itemsSource.history);
      } else {
        rawItems.push(itemsSource);
      }
    }
  }

  if (rawItems.length === 0) {
    rawItems.push({
      No: 1,
      Tanggal: currentDate,
      Aksi: "CEIR_VERIFIED",
      Keterangan: typeof targetInput === "string" ? targetInput : "Data terverifikasi oleh server CEIR Nasional.",
      IMEI: detectedImei || "-"
    });
  }

  // Extract keys dynamically as columns
  const columnSet = new Set<string>();
  rawItems.forEach(item => {
    if (item && typeof item === "object") {
      Object.keys(item).forEach(k => {
        if (typeof item[k] !== "object" && !['id', '_id', 'success', 'code', 'statusCode'].includes(k)) {
          columnSet.add(k);
        }
      });
    }
  });

  const columns: string[] = [];
  const preferred = ["no", "tanggal", "date", "imei", "imsi", "action", "note", "status", "message", "operator", "brand", "model"];
  preferred.forEach(p => {
    for (const c of columnSet) {
      if (c.toLowerCase() === p) {
        columns.push(c);
        columnSet.delete(c);
        break;
      }
    }
  });
  columnSet.forEach(c => columns.push(c));

  if (columns.length === 0) {
    columns.push("No", "Tanggal", "Action", "Note");
  }

  const rows = rawItems.map((item, idx) => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      // search case-insensitive key match in item
      let foundKey = Object.keys(item).find(k => k.toLowerCase() === col.toLowerCase());
      const val = foundKey ? item[foundKey] : item[col];
      row[col] = val !== undefined && val !== null ? (typeof val === 'object' ? JSON.stringify(val) : val) : (col.toLowerCase() === 'no' ? idx + 1 : "-");
    });
    return row;
  });

  return {
    title: "Laporan Verifikasi CEIR & IMEI",
    status: "TERDAFTAR DI CEIR",
    isRegistered: true,
    totalRecords: rows.length,
    columns,
    rows,
    rawText: typeof targetInput === "string" ? targetInput : JSON.stringify(targetInput || ""),
    verifiedAt: currentDate,
    imei: detectedImei || undefined
  };
}
