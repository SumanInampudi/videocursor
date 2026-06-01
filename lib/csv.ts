/** Minimal CSV parse/stringify for migration templates (RFC4180-ish). */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(cell.trim());
      cell = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  return rows;
}

export function stringifyCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(",")
    )
    .join("\n");
}

export function rowsToObjects<T extends Record<string, string>>(
  rows: string[][],
  requiredHeaders: (keyof T & string)[]
): { data: T[]; error?: string } {
  if (rows.length < 2) {
    return { data: [], error: "CSV must include a header row and at least one data row" };
  }

  const headers = rows[0]!.map((h) => h.trim().toLowerCase());
  for (const req of requiredHeaders) {
    if (!headers.includes(req.toLowerCase())) {
      return { data: [], error: `Missing column: ${req}` };
    }
  }

  const data: T[] = [];
  for (let i = 1; i < rows.length; i++) {
    const line = rows[i]!;
    if (line.every((c) => !c.trim())) continue;
    const obj = {} as T;
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j] as keyof T & string;
      obj[key] = (line[j] ?? "").trim() as T[keyof T & string];
    }
    data.push(obj);
  }

  return { data };
}
