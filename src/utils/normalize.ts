/**
 * Value normalization utilities.
 * Cohesion: 1.0 — all functions perform string/number canonicalization.
 */

// Conversions & Normalization Rules
export function excelSerialToDateStr(serial: number): string {
  if (serial < 1 || serial > 1000000) return String(serial);
  try {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const d = new Date(utc_value * 1000);

    // Check if valid date
    if (isNaN(d.getTime())) return String(serial);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return String(serial);
  }
}

// Normalize strings, strip leading zeros, clean white space, detect Date patterns
export function normalizeValue(val: any): string {
  if (val === undefined || val === null) return "";

  // If it's a boolean or number
  if (typeof val === "number") {
    // Check if it looks like an Excel serial date (e.g. 35000 to 70000)
    if (val >= 35000 && val <= 70000) {
      return excelSerialToDateStr(val);
    }
    return String(val).trim().replace(/^0+/, "") || "0";
  }

  let str = String(val).trim();
  if (!str) return "";

  // Check if string matches Excel serial date or ISO / custom date pattern
  // E.g. YYYY-MM-DD, MM/DD/YYYY or DD/MM/YYYY
  const isoDateRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
  const slashesDateRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;

  if (isoDateRegex.test(str)) {
    const match = str.match(isoDateRegex);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, "0");
      const d = match[3].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } else if (slashesDateRegex.test(str)) {
    const match = str.match(slashesDateRegex);
    if (match) {
      // Could be DD/MM/YYYY or MM/DD/YYYY. Let's try standard JS parser
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
  }

  // Strip leading zeros for strings (e.g. "000123" -> "123")
  const stripped = str.replace(/^0+/, "");
  if (stripped === "") return "0"; // edge case for "000" -> "0"
  return stripped;
}
