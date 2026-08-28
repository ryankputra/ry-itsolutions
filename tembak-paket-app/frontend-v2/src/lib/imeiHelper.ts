/**
 * Helper utility for IMEI validation (Luhn algorithm) and Brand/Model TAC identification.
 */

// Luhn Algorithm validation for 15-digit IMEI
export function validateImeiLuhn(imei: string): boolean {
  const cleanImei = imei.replace(/\D/g, "");
  if (cleanImei.length !== 15) return false;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(cleanImei[i], 10);
    // Double every second digit starting from right (0-indexed: index 1, 3, 5, 7, 9, 11, 13)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// TAC (Type Allocation Code - first 8 digits of IMEI) database map
interface TacRecord {
  brand: string;
  model: string;
  type?: string;
}

const TAC_PREFIX_MAP: Record<string, TacRecord> = {
  // === APPLE IPHONE 16 SERIES ===
  "35123416": { brand: "Apple", model: "iPhone 16", type: "apple" },
  "35123516": { brand: "Apple", model: "iPhone 16 Plus", type: "apple" },
  "35123616": { brand: "Apple", model: "iPhone 16 Pro", type: "apple" },
  "35123716": { brand: "Apple", model: "iPhone 16 Pro Max", type: "apple" },
  "35451216": { brand: "Apple", model: "iPhone 16", type: "apple" },
  "35451316": { brand: "Apple", model: "iPhone 16 Plus", type: "apple" },
  "35451416": { brand: "Apple", model: "iPhone 16 Pro", type: "apple" },
  "35451516": { brand: "Apple", model: "iPhone 16 Pro Max", type: "apple" },

  // === APPLE IPHONE 15 SERIES ===
  "35368117": { brand: "Apple", model: "iPhone 15", type: "apple" },
  "35368217": { brand: "Apple", model: "iPhone 15 Plus", type: "apple" },
  "35368317": { brand: "Apple", model: "iPhone 15 Pro", type: "apple" },
  "35368417": { brand: "Apple", model: "iPhone 15 Pro Max", type: "apple" },
  "35246747": { brand: "Apple", model: "iPhone 15 Pro Max", type: "apple" },
  "35246647": { brand: "Apple", model: "iPhone 15 Pro", type: "apple" },
  "35246547": { brand: "Apple", model: "iPhone 15 Plus", type: "apple" },
  "35246447": { brand: "Apple", model: "iPhone 15", type: "apple" },
  "35773177": { brand: "Apple", model: "iPhone 15", type: "apple" },
  "35773277": { brand: "Apple", model: "iPhone 15 Plus", type: "apple" },
  "35773377": { brand: "Apple", model: "iPhone 15 Pro", type: "apple" },
  "35773477": { brand: "Apple", model: "iPhone 15 Pro Max", type: "apple" },
  "35905117": { brand: "Apple", model: "iPhone 15", type: "apple" },
  "35905217": { brand: "Apple", model: "iPhone 15 Plus", type: "apple" },
  "35905317": { brand: "Apple", model: "iPhone 15 Pro", type: "apple" },
  "35905417": { brand: "Apple", model: "iPhone 15 Pro Max", type: "apple" },

  // === APPLE IPHONE 14 SERIES ===
  "35398285": { brand: "Apple", model: "iPhone 14 Pro Max", type: "apple" },
  "35398185": { brand: "Apple", model: "iPhone 14 Pro", type: "apple" },
  "35398085": { brand: "Apple", model: "iPhone 14 Plus", type: "apple" },
  "35397985": { brand: "Apple", model: "iPhone 14", type: "apple" },
  "35266155": { brand: "Apple", model: "iPhone 14 Pro Max", type: "apple" },
  "35266055": { brand: "Apple", model: "iPhone 14 Pro", type: "apple" },
  "35265955": { brand: "Apple", model: "iPhone 14", type: "apple" },
  "35265855": { brand: "Apple", model: "iPhone 14 Plus", type: "apple" },
  "35084155": { brand: "Apple", model: "iPhone 14", type: "apple" },
  "35084255": { brand: "Apple", model: "iPhone 14 Plus", type: "apple" },
  "35084355": { brand: "Apple", model: "iPhone 14 Pro", type: "apple" },
  "35084455": { brand: "Apple", model: "iPhone 14 Pro Max", type: "apple" },

  // === APPLE IPHONE 13 SERIES ===
  "35441584": { brand: "Apple", model: "iPhone 13 Pro Max", type: "apple" },
  "35441484": { brand: "Apple", model: "iPhone 13 Pro", type: "apple" },
  "35441384": { brand: "Apple", model: "iPhone 13", type: "apple" },
  "35441284": { brand: "Apple", model: "iPhone 13 Mini", type: "apple" },
  "35028821": { brand: "Apple", model: "iPhone 13 Pro Max", type: "apple" },
  "35028721": { brand: "Apple", model: "iPhone 13 Pro", type: "apple" },
  "35028621": { brand: "Apple", model: "iPhone 13", type: "apple" },
  "35028521": { brand: "Apple", model: "iPhone 13 Mini", type: "apple" },
  "35494173": { brand: "Apple", model: "iPhone 13", type: "apple" },
  "35494273": { brand: "Apple", model: "iPhone 13 Mini", type: "apple" },
  "35494373": { brand: "Apple", model: "iPhone 13 Pro", type: "apple" },
  "35494473": { brand: "Apple", model: "iPhone 13 Pro Max", type: "apple" },
  "35071164": { brand: "Apple", model: "iPhone 13 Mini", type: "apple" },
  "35071264": { brand: "Apple", model: "iPhone 13", type: "apple" },
  "35071364": { brand: "Apple", model: "iPhone 13 Pro", type: "apple" },
  "35071464": { brand: "Apple", model: "iPhone 13 Pro Max", type: "apple" },

  // === APPLE IPHONE 12 SERIES ===
  "35698311": { brand: "Apple", model: "iPhone 12 Pro Max", type: "apple" },
  "35698211": { brand: "Apple", model: "iPhone 12 Pro", type: "apple" },
  "35698111": { brand: "Apple", model: "iPhone 12", type: "apple" },
  "35698011": { brand: "Apple", model: "iPhone 12 Mini", type: "apple" },
  "35304711": { brand: "Apple", model: "iPhone 12 Pro Max", type: "apple" },
  "35304611": { brand: "Apple", model: "iPhone 12 Pro", type: "apple" },
  "35304511": { brand: "Apple", model: "iPhone 12", type: "apple" },
  "35304411": { brand: "Apple", model: "iPhone 12 Mini", type: "apple" },
  "35439511": { brand: "Apple", model: "iPhone 12 Mini", type: "apple" },
  "35439611": { brand: "Apple", model: "iPhone 12", type: "apple" },
  "35439711": { brand: "Apple", model: "iPhone 12 Pro", type: "apple" },
  "35439811": { brand: "Apple", model: "iPhone 12 Pro Max", type: "apple" },

  // === APPLE IPHONE 11 SERIES ===
  "35396910": { brand: "Apple", model: "iPhone 11 (A2221 / A2111)", type: "apple" },
  "35397010": { brand: "Apple", model: "iPhone 11 Pro (A2215)", type: "apple" },
  "35397110": { brand: "Apple", model: "iPhone 11 Pro Max (A2218)", type: "apple" },
  "35390710": { brand: "Apple", model: "iPhone 11", type: "apple" },
  "35390810": { brand: "Apple", model: "iPhone 11 Pro", type: "apple" },
  "35390910": { brand: "Apple", model: "iPhone 11 Pro Max", type: "apple" },
  "35655510": { brand: "Apple", model: "iPhone 11", type: "apple" },
  "35655610": { brand: "Apple", model: "iPhone 11 Pro", type: "apple" },
  "35655710": { brand: "Apple", model: "iPhone 11 Pro Max", type: "apple" },
  "35284410": { brand: "Apple", model: "iPhone 11", type: "apple" },
  "35284510": { brand: "Apple", model: "iPhone 11 Pro", type: "apple" },
  "35284610": { brand: "Apple", model: "iPhone 11 Pro Max", type: "apple" },
  "35657810": { brand: "Apple", model: "iPhone 11", type: "apple" },
  "35657910": { brand: "Apple", model: "iPhone 11 Pro", type: "apple" },
  "35658010": { brand: "Apple", model: "iPhone 11 Pro Max", type: "apple" },

  // === APPLE IPHONE X / XS / XR / 8 / 7 / SE ===
  "35728509": { brand: "Apple", model: "iPhone XS Max", type: "apple" },
  "35728409": { brand: "Apple", model: "iPhone XS", type: "apple" },
  "35728309": { brand: "Apple", model: "iPhone XR", type: "apple" },
  "35298809": { brand: "Apple", model: "iPhone XR", type: "apple" },
  "35298909": { brand: "Apple", model: "iPhone XS", type: "apple" },
  "35299009": { brand: "Apple", model: "iPhone XS Max", type: "apple" },
  "35676908": { brand: "Apple", model: "iPhone X", type: "apple" },
  "35676808": { brand: "Apple", model: "iPhone 8 Plus", type: "apple" },
  "35676708": { brand: "Apple", model: "iPhone 8", type: "apple" },
  "35940408": { brand: "Apple", model: "iPhone 7", type: "apple" },
  "35940508": { brand: "Apple", model: "iPhone 7 Plus", type: "apple" },
  "35876210": { brand: "Apple", model: "iPhone SE (2020)", type: "apple" },
  "35876311": { brand: "Apple", model: "iPhone SE (2022)", type: "apple" },

  // === SAMSUNG GALAXY S SERIES ===
  "35299111": { brand: "Samsung", model: "Galaxy S25 Ultra", type: "samsung" },
  "35286511": { brand: "Samsung", model: "Galaxy S24 Ultra", type: "samsung" },
  "35286411": { brand: "Samsung", model: "Galaxy S24+", type: "samsung" },
  "35286311": { brand: "Samsung", model: "Galaxy S24", type: "samsung" },
  "35174511": { brand: "Samsung", model: "Galaxy S23 Ultra", type: "samsung" },
  "35174411": { brand: "Samsung", model: "Galaxy S23+", type: "samsung" },
  "35174311": { brand: "Samsung", model: "Galaxy S23", type: "samsung" },
  "35987110": { brand: "Samsung", model: "Galaxy S22 Ultra", type: "samsung" },
  "35987010": { brand: "Samsung", model: "Galaxy S22+", type: "samsung" },
  "35986910": { brand: "Samsung", model: "Galaxy S22", type: "samsung" },
  "35641411": { brand: "Samsung", model: "Galaxy S21 Ultra", type: "samsung" },
  "35641311": { brand: "Samsung", model: "Galaxy S21+", type: "samsung" },
  "35641211": { brand: "Samsung", model: "Galaxy S21", type: "samsung" },
  "35841410": { brand: "Samsung", model: "Galaxy S20 Ultra", type: "samsung" },
  "35841310": { brand: "Samsung", model: "Galaxy S20+", type: "samsung" },
  "35841210": { brand: "Samsung", model: "Galaxy S20", type: "samsung" },
  "35851410": { brand: "Samsung", model: "Galaxy Note 20 Ultra", type: "samsung" },

  // === SAMSUNG GALAXY Z / A SERIES ===
  "35245811": { brand: "Samsung", model: "Galaxy Z Fold6", type: "samsung" },
  "35245711": { brand: "Samsung", model: "Galaxy Z Flip6", type: "samsung" },
  "35478910": { brand: "Samsung", model: "Galaxy Z Fold5", type: "samsung" },
  "35478810": { brand: "Samsung", model: "Galaxy Z Flip5", type: "samsung" },
  "35328910": { brand: "Samsung", model: "Galaxy Z Fold4", type: "samsung" },
  "35328810": { brand: "Samsung", model: "Galaxy Z Flip4", type: "samsung" },
  "35311211": { brand: "Samsung", model: "Galaxy A55 5G", type: "samsung" },
  "35191211": { brand: "Samsung", model: "Galaxy A54 5G", type: "samsung" },
  "35181211": { brand: "Samsung", model: "Galaxy A34 5G", type: "samsung" },

  // === GOOGLE PIXEL ===
  "35500911": { brand: "Google", model: "Pixel 9 Pro XL", type: "android" },
  "35500811": { brand: "Google", model: "Pixel 9 Pro", type: "android" },
  "35500711": { brand: "Google", model: "Pixel 9", type: "android" },
  "35400811": { brand: "Google", model: "Pixel 8 Pro", type: "android" },
  "35400711": { brand: "Google", model: "Pixel 8", type: "android" },
  "35746910": { brand: "Google", model: "Pixel 7 Pro", type: "android" },
  "35746810": { brand: "Google", model: "Pixel 7", type: "android" },
  "35866909": { brand: "Google", model: "Pixel 6 Pro", type: "android" },
  "35866809": { brand: "Google", model: "Pixel 6", type: "android" },

  // === XIAOMI / REDMI / POCO ===
  "86043204": { brand: "Xiaomi", model: "Xiaomi 14 / 14 Ultra", type: "android" },
  "86043304": { brand: "Xiaomi", model: "Xiaomi 14 Pro", type: "android" },
  "86782305": { brand: "Xiaomi", model: "Xiaomi 13 / 13 Pro", type: "android" },
  "86982305": { brand: "Xiaomi", model: "Xiaomi 12 / 12 Pro", type: "android" },
  "86129805": { brand: "Poco", model: "Poco F6 / F6 Pro", type: "android" },
  "86119805": { brand: "Poco", model: "Poco F5 / X6 Pro", type: "android" },
  "86229805": { brand: "Redmi", model: "Redmi Note 13 Pro+", type: "android" },
  "86219805": { brand: "Redmi", model: "Redmi Note 12 Pro", type: "android" },

  // === OPPO / VIVO / REALME / INFINIX ===
  "86341205": { brand: "Oppo", model: "Find X7 / X6 Ultra", type: "android" },
  "86351205": { brand: "Oppo", model: "Reno 12 / 11 Pro", type: "android" },
  "86441205": { brand: "Vivo", model: "Vivo X100 / X90 Pro", type: "android" },
  "86451205": { brand: "Vivo", model: "Vivo V30 / V29 5G", type: "android" },
  "86551205": { brand: "Realme", model: "Realme GT 6 / GT 5 Pro", type: "android" },
  "86661205": { brand: "Infinix", model: "Infinix GT 20 Pro / Zero 30", type: "android" },
  "35481211": { brand: "Asus", model: "ROG Phone 8 / 8 Pro", type: "android" },
};

// Smart 6-digit & family heuristic fallback
function getHeuristicBrand(tac6: string, tac8: string): { brand: string, model: string, type: string } {
  // Apple allocations
  if (tac6.startsWith("35") && (tac6.endsWith("10") || tac6.endsWith("11") || tac6.endsWith("12") || tac6.endsWith("13") || tac6.endsWith("14") || tac6.endsWith("15") || tac6.endsWith("16") || tac6.endsWith("17") || tac6.endsWith("21") || tac6.endsWith("09") || tac6.endsWith("08"))) {
    // Specific Apple year brackets
    if (tac6.endsWith("16") || tac6.endsWith("17")) return { brand: "Apple", model: "iPhone 15 / 16 Series (iOS Device)", type: "apple" };
    if (tac6.endsWith("14") || tac6.endsWith("15") || tac6.endsWith("55") || tac6.endsWith("85")) return { brand: "Apple", model: "iPhone 13 / 14 Series (iOS Device)", type: "apple" };
    if (tac6.endsWith("11") || tac6.endsWith("21")) return { brand: "Apple", model: "iPhone 12 / 13 Series (iOS Device)", type: "apple" };
    if (tac6.endsWith("10")) return { brand: "Apple", model: "iPhone 11 Series (A2221 / A2215 / A2218)", type: "apple" };
    if (tac6.endsWith("09") || tac6.endsWith("08")) return { brand: "Apple", model: "iPhone X / XR / XS / 8 Series", type: "apple" };
    return { brand: "Apple", model: "iPhone / iOS Smartphone", type: "apple" };
  }

  if (tac6.startsWith("35") || tac6.startsWith("01") || tac6.startsWith("99")) {
    return { brand: "Apple / Global", model: "iOS / Smartphone", type: "apple" };
  }
  if (tac6.startsWith("86")) {
    return { brand: "Xiaomi / Oppo / Vivo / Android", model: "Android Smartphone", type: "android" };
  }
  return { brand: "Smartphone", model: "Mobile Device", type: "generic" };
}

export interface ImeiAnalysis {
  raw: string;
  clean: string;
  isValidLength: boolean;
  isValidLuhn: boolean;
  brand: string;
  model: string;
  type: string;
  isApple: boolean;
}

export function analyzeImei(input: string): ImeiAnalysis {
  const clean = input.replace(/\D/g, "");
  const isValidLength = clean.length === 15;
  const isValidLuhn = isValidLength ? validateImeiLuhn(clean) : false;

  if (clean.length < 8) {
    return {
      raw: input,
      clean,
      isValidLength: false,
      isValidLuhn: false,
      brand: "",
      model: "",
      type: "generic",
      isApple: false
    };
  }

  const tac8 = clean.substring(0, 8);
  const matchedTac = TAC_PREFIX_MAP[tac8];

  if (matchedTac) {
    return {
      raw: input,
      clean,
      isValidLength,
      isValidLuhn,
      brand: matchedTac.brand,
      model: matchedTac.model,
      type: matchedTac.type || "generic",
      isApple: matchedTac.brand === "Apple"
    };
  }

  // Check 6-digit heuristic or general pattern
  const fallback = getHeuristicBrand(clean.substring(0, 6), tac8);
  return {
    raw: input,
    clean,
    isValidLength,
    isValidLuhn,
    brand: fallback.brand,
    model: fallback.model,
    type: fallback.type,
    isApple: fallback.brand.includes("Apple")
  };
}

export function parseMultipleImeis(input: string): ImeiAnalysis[] {
  const lines = input.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);
  return lines.map(line => analyzeImei(line));
}
