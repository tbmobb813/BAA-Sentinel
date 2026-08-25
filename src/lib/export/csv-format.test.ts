import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "./csv-format";

describe("csvCell", () => {
  it("leaves a plain value unquoted", () => {
    expect(csvCell("Acme")).toBe("Acme");
  });

  it("quotes and escapes a value containing a comma", () => {
    expect(csvCell("Acme, Inc.")).toBe('"Acme, Inc."');
  });

  it("quotes and doubles embedded quotes", () => {
    expect(csvCell('Said "hello"')).toBe('"Said ""hello"""');
  });

  it("quotes a value containing an embedded newline", () => {
    expect(csvCell("Line1\nLine2")).toBe('"Line1\nLine2"');
  });

  it("quotes a value containing a bare carriage return", () => {
    expect(csvCell("Line1\rLine2")).toBe('"Line1\rLine2"');
  });
});

describe("csvRow", () => {
  it("joins fields with commas, quoting only where needed", () => {
    expect(csvRow(["Acme, Inc.", 'Said "hello"', "plain", 42])).toBe(
      '"Acme, Inc.","Said ""hello""",plain,42',
    );
  });

  it("renders null as an empty field", () => {
    expect(csvRow(["a", null, "b"])).toBe("a,,b");
  });
});
