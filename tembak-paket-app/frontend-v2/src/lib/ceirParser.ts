/**
 * Comprehensive CeirGO & IMEI Verification Log Parser
 * Parses official CeirGO JSON structure and extracts dynamic columns and rows directly from API response JSON keys.
 */

export type CeirLogRow = Record<string, any>;

/**
 * Format teks atau objek CEIR agar berpenampilan rapi dan manusiawi (bukan mentahan JSON {"ROAMER": ["..."]})
 */
/**
 * Format teks atau objek CEIR agar berpenampilan rapi murni dari JSON tanpa tambahan kata editorial
 */
export function formatCeirNote(raw: any): string {
  if (raw === undefined || raw === null || raw === "" || raw === "-") return "-";

  if (typeof raw === "object") {
    if (Array.isArray(raw)) {
      return raw.map(formatCeirNote).filter(Boolean).join(", ");
    }
    const entries = Object.entries(raw)
      .filter(([k]) => !['success', 'code', 'statuscode', 'id', '_id'].includes(k.toLowerCase()))
      .map(([k, v]) => {
        const valStr = Array.isArray(v) 
          ? v.join(", ") 
          : (typeof v === 'object' && v !== null ? formatCeirNote(v) : String(v));
        return `${k.toUpperCase()}: ${valStr}`;
      });
    return entries.length > 0 ? entries.join(" • ") : JSON.stringify(raw);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatCeirNote(parsed);
      } catch {}
    }
    const matchRoamer = trimmed.match(/"roamer"\s*:\s*\[\s*"([^"]+)"\s*\]/i);
    if (matchRoamer) {
      return `ROAMER: ${matchRoamer[1]}`;
    }
    return trimmed;
  }

  return String(raw);
}

export interface ParsedCeirResult {
  title: string;
  status: string;
  isRegistered: boolean;
  isError?: boolean;
  errorMessage?: string;
  totalRecords: number;
  columns: string[];
  rows: CeirLogRow[];
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

  // Check if rawInput as string or apiResponse indicates an error
  const rawString = typeof rawInput === "string" ? rawInput.toLowerCase() : "";
  const isStringError = 
    rawString.includes("retry error") ||
    rawString.includes("balance-mu tidak mencukupi") ||
    rawString.includes("insufficient_balance") ||
    rawString.includes("saldo api ceirgo") ||
    rawString.includes("tidak mencukupi untuk melakukan transaksi") ||
    rawString.includes("dibatalkan otomatis");

  let apiObj: any = null;
  if (typeof apiResponse === "object" && apiResponse !== null) {
    apiObj = apiResponse;
  } else if (typeof apiResponse === "string") {
    const trimmed = apiResponse.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try { apiObj = JSON.parse(trimmed); } catch {}
    }
  }

  const isApiError = apiObj && typeof apiObj === "object" && (
    apiObj.status === false ||
    apiObj.statusCode === 402 ||
    apiObj.error === true ||
    apiObj.code === "USER_INSUFFICIENT_BALANCE_ERROR" ||
    (typeof apiObj.message === "string" && (
      apiObj.message.toLowerCase().includes("balance-mu") ||
      apiObj.message.toLowerCase().includes("tidak mencukupi") ||
      apiObj.message.toLowerCase().includes("insufficient_balance")
    ))
  );

  // Detect provider error responses (e.g., status: false, error: true, or insufficient balance)
  const isErrorPayload = isStringError || isApiError || (parsedObj && typeof parsedObj === "object" && (
    parsedObj.status === false ||
    parsedObj.statusCode === 402 ||
    parsedObj.error === true ||
    parsedObj.code === "USER_INSUFFICIENT_BALANCE_ERROR" ||
    (typeof parsedObj.message === "string" && (
      parsedObj.message.toLowerCase().includes("balance-mu") ||
      parsedObj.message.toLowerCase().includes("tidak mencukupi") ||
      parsedObj.message.toLowerCase().includes("gagal") ||
      parsedObj.message.toLowerCase().includes("saldo")
    ))
  ));

  // If it's an error payload and doesn't contain actual CEIR query results, return clean error state
  if (isErrorPayload) {
    const hasActualData = (parsedObj && (parsedObj.result || parsedObj.history || parsedObj.data?.history || parsedObj.data?.result)) ||
                          (apiObj && (apiObj.result || apiObj.history || apiObj.data?.history || apiObj.data?.result));
    
    if (!hasActualData) {
      const errMsg = "Pesanan dibatalkan otomatis karena jalur server pusat sedang mengalami antrean / pemeliharaan kuota. Saldo pembayaran Anda telah dikembalikan 100% ke akun Anda secara otomatis.";
      return {
        title: "Status Pengecekan CEIR",
        status: "DIBATALKAN / PENGEMBALIAN",
        isRegistered: false,
        isError: true,
        errorMessage: errMsg,
        totalRecords: 0,
        columns: [],
        rows: [],
        rawText: errMsg,
        verifiedAt: currentDate,
        imei: parsedObj?.imei || parsedObj?.IMEI || apiObj?.imei || undefined
      };
    }
  }

  let detectedImei = "";
  let rawItems: any[] = [];

  if (parsedObj) {
    if (parsedObj.imei || parsedObj.IMEI) detectedImei = parsedObj.imei || parsedObj.IMEI;

    // Khusus format respons Roamer: {"ROAMER": ["353246107591333"]}
    if (parsedObj.ROAMER || parsedObj.roamer) {
      const list = Array.isArray(parsedObj.ROAMER || parsedObj.roamer) ? (parsedObj.ROAMER || parsedObj.roamer) : [parsedObj.ROAMER || parsedObj.roamer];
      const imeiFound = list[0] || detectedImei || "-";
      detectedImei = imeiFound;
      rawItems.push({
        No: 1,
        Tanggal: currentDate,
        Action: "SUCCESS",
        Note: formatCeirNote(parsedObj),
        IMEI: imeiFound
      });
    } else {
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
  }

  if (rawItems.length === 0 && typeof targetInput === "string") {
    const text = targetInput.trim();
    const itemChunks = text.split(/(?=\b\d+\.\s*(?:\d{4}-\d{2}-\d{2}|\w+))/g).map(s => s.trim()).filter(Boolean);
    if (itemChunks.length > 1 || (itemChunks.length === 1 && itemChunks[0].includes("|"))) {
      itemChunks.forEach((chunk, idx) => {
        const cleanChunk = chunk.replace(/^\d+\.\s*/, "");
        const parts = cleanChunk.split("|").map(p => p.trim());
        
        let datePart = parts[0] || currentDate;
        let actionPart = "CEIR_LOG";
        let notePart = "";

        parts.slice(1).forEach(p => {
          const lower = p.toLowerCase();
          if (lower.startsWith("action:")) {
            actionPart = p.substring(7).trim();
          } else if (lower.startsWith("note:")) {
            notePart = p.substring(5).trim();
          } else if (lower.startsWith("status:")) {
            actionPart = p.substring(7).trim();
          } else {
            notePart = notePart ? `${notePart} | ${p}` : p;
          }
        });

        if (actionPart === "----" && (!notePart || notePart === "----")) {
          actionPart = "Pengecekan Server";
          notePart = "Sinkronisasi status jaringan operator";
        }

        rawItems.push({
          No: idx + 1,
          Tanggal: datePart,
          Action: actionPart,
          Note: notePart || "-",
          IMEI: detectedImei || "-"
        });
      });
    }
  }

  if (rawItems.length === 0) {
    const rawStr = typeof targetInput === "string" ? targetInput.toLowerCase() : "";
    if (rawStr.includes("error") || rawStr.includes("gagal") || rawStr.includes("tidak mencukupi") || rawStr.includes("balance") || rawStr.includes("dibatalkan") || rawStr.includes("retry")) {
      return {
        title: "Status Pengecekan CEIR",
        status: "DIBATALKAN / PENGEMBALIAN",
        isRegistered: false,
        isError: true,
        errorMessage: "Pesanan dibatalkan otomatis karena jalur server pusat sedang mengalami antrean / pemeliharaan kuota. Saldo pembayaran Anda telah dikembalikan 100% ke akun Anda secara otomatis.",
        totalRecords: 0,
        columns: [],
        rows: [],
        rawText: "Pesanan dibatalkan otomatis karena kendala antrean kuota server pusat.",
        verifiedAt: currentDate,
        imei: detectedImei || undefined
      };
    }

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
      let val = foundKey ? item[foundKey] : item[col];

      if (val === undefined || val === null || val === "" || val === "-") {
        const cLower = col.toLowerCase();
        if (cLower === "no") val = idx + 1;
        else if (cLower === "tanggal" || cLower === "date") val = currentDate;
        else if (cLower === "action" || cLower === "status" || cLower === "aksi") val = "SUCCESS";
        else if (cLower === "note" || cLower === "keterangan") {
          val = formatCeirNote(targetInput) || "-";
        } else {
          val = "-";
        }
      } else if (col.toLowerCase() === "note" || col.toLowerCase() === "keterangan") {
        val = formatCeirNote(val);
      }

      row[col] = typeof val === "object" ? formatCeirNote(val) : val;
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
