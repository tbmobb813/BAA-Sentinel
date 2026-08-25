// RFC 4180 quoting: wrap in quotes if the field contains a comma, quote,
// or newline (LF or CR), and double any embedded quotes.
export function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function csvRow(values: (string | number | null)[]): string {
  return values.map((v) => csvCell(v === null ? "" : String(v))).join(",");
}
