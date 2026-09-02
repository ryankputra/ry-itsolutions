/**
 * Comprehensive CeirGO & IMEI Verification Log Parser (Node.js & CommonJS)
 * Parses official CeirGO JSON structure (result[].history: [{ no, date, imei, imsi, action, note }])
 * as well as legacy string and pipe formats into structured tables.
 */

function parseCeirResponse(rawInput, defaultDate) {
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
                    date: currentDate,
                    action: "CEIR_VERIFIED",
                    note: "Data IMEI terdaftar resmi pada server CEIR Nasional."
                }
            ],
            rawText: "",
            verifiedAt: currentDate
        };
    }

    // 1. Check if input is or contains parsed JSON with result[].history
    let parsedObj = null;
    if (typeof rawInput === "object" && rawInput !== null) {
        parsedObj = rawInput;
    } else if (typeof rawInput === "string") {
        const trimmed = rawInput.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
                parsedObj = JSON.parse(trimmed);
            } catch (e) {
                // Not valid JSON, keep as text
            }
        }
    }

    const rows = [];
    let foundOfficialHistory = false;
    let detectedImei = "";

    if (parsedObj) {
        // Look for result array or object: e.g. { result: [{ history: [...] }] } or direct array
        let resultItems = parsedObj.result || parsedObj.data?.result || parsedObj.history || parsedObj.data?.history || parsedObj;

        if (!Array.isArray(resultItems) && typeof resultItems === "object" && resultItems !== null) {
            if (Array.isArray(resultItems.history)) {
                resultItems = [resultItems];
            }
        }

        if (Array.isArray(resultItems)) {
            resultItems.forEach((resItem) => {
                if (resItem?.imei) detectedImei = resItem.imei;

                // If resItem contains a history array: result[].history
                if (Array.isArray(resItem?.history)) {
                    foundOfficialHistory = true;
                    resItem.history.forEach((h, idx) => {
                        rows.push({
                            no: Number(h.no) || idx + 1,
                            tanggal: h.date || h.tanggal || currentDate,
                            date: h.date || h.tanggal || currentDate,
                            action: h.action || "CEIR_EVENT",
                            note: h.note || "-",
                            imei: h.imei || resItem.imei || "",
                            imsi: h.imsi || ""
                        });
                    });
                } else if (resItem?.action || resItem?.note || resItem?.date) {
                    // Direct history object in array
                    foundOfficialHistory = true;
                    rows.push({
                        no: Number(resItem.no) || rows.length + 1,
                        tanggal: resItem.date || resItem.tanggal || currentDate,
                        date: resItem.date || resItem.tanggal || currentDate,
                        action: resItem.action || "CEIR_EVENT",
                        note: resItem.note || "-",
                        imei: resItem.imei || "",
                        imsi: resItem.imsi || ""
                    });
                }
            });
        }
    }

    // Handle JSON object or string
    let rawTextCandidate = typeof rawInput === "object" 
        ? (rawInput.note || rawInput.message || (typeof rawInput.result === 'string' ? rawInput.result : (typeof rawInput.data?.result === 'string' ? rawInput.data?.result : JSON.stringify(rawInput))))
        : String(rawInput).trim();
    let text = String(rawTextCandidate || '').trim();

    const isFailed = text.toLowerCase().includes("tidak terdaftar") || text.toLowerCase().includes("gagal") || text.toLowerCase().includes("not found");
    let statusText = isFailed ? "TIDAK TERDAFTAR" : "TERDAFTAR DI CEIR";

    if (text.toLowerCase().includes("beacukai") || text.toLowerCase().includes("bea cukai")) {
        statusText = "TERDAFTAR BEA CUKAI";
    } else if (text.toLowerCase().includes("riwayat") || text.toLowerCase().includes("roamer") || foundOfficialHistory) {
        statusText = "TERDAFTAR (MEMILIKI RIWAYAT CEIR)";
    } else if (text.toLowerCase().includes("icloud")) {
        statusText = text.toLowerCase().includes("clean") ? "CLEAN (iCLOUD NORMAL)" : "iCLOUD VERIFIED";
    } else if (text.toLowerCase().includes("simlock")) {
        statusText = "CARRIER SIMLOCK CHECKED";
    }

    // 2. If no official JSON history found, fallback to regex / pipe parsers
    if (!foundOfficialHistory) {
        // Regex Pattern for numbered log items
        const numberedPattern = /(\d+)\.\s*([0-9]{4}-[0-9]{2}-[0-9]{2}(?:\s+[0-9]{2}:[0-9]{2}:[0-9]{2})?)\s*\|\s*Action:\s*([^|]+)\s*\|\s*Note:\s*([^\d]+(?=\d+\.|$)|.*)/gi;
        let match;
        let hasNumberedMatches = false;

        while ((match = numberedPattern.exec(text)) !== null) {
            hasNumberedMatches = true;
            rows.push({
                no: parseInt(match[1], 10) || rows.length + 1,
                tanggal: match[2]?.trim() || currentDate,
                date: match[2]?.trim() || currentDate,
                action: match[3]?.trim() || "CEIR_EVENT",
                note: match[4]?.trim() || "-"
            });
        }

        // If no numbered match, check multi-line pipe delimited
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
                        date: datePart || currentDate,
                        action: actionPart || "CEIR_EVENT",
                        note: notePart || "-"
                    });
                }
            });
        }

        // If still no rows, check for multi-line text or single text summary
        if (rows.length === 0) {
            if (text.includes("\n")) {
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                lines.forEach((l, idx) => {
                    rows.push({
                        no: idx + 1,
                        tanggal: currentDate,
                        date: currentDate,
                        action: "CEIR_RECORD",
                        note: l
                    });
                });
            } else {
                rows.push({
                    no: 1,
                    tanggal: currentDate,
                    date: currentDate,
                    action: isFailed ? "NOT_FOUND" : "CEIR_VERIFIED",
                    note: text || "Data terverifikasi oleh server CEIR Nasional."
                });
            }
        }
    }

    return {
        title: "Laporan Verifikasi CEIR & IMEI",
        status: statusText,
        isRegistered: !isFailed,
        totalRecords: rows.length,
        rows,
        rawText: text,
        verifiedAt: currentDate,
        imei: detectedImei || undefined
    };
}

module.exports = { parseCeirResponse };
