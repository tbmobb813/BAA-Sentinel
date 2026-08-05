export function exportFilename(organizationName: string, extension: "csv" | "pdf") {
  const slug = organizationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || "baa-sentinel"}-vendors-${date}.${extension}`;
}
