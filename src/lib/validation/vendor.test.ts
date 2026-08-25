import { describe, expect, it } from "vitest";
import { createVendorSchema } from "./vendor";

describe("createVendorSchema", () => {
  it("accepts valid input", () => {
    const result = createVendorSchema.safeParse({
      name: "Acme Corp",
      contactName: "Jane Doe",
      contactEmail: "jane@acme.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty vendor name", () => {
    const result = createVendorSchema.safeParse({
      name: "",
      contactName: "Jane Doe",
      contactEmail: "jane@acme.com",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid contact email", () => {
    const result = createVendorSchema.safeParse({
      name: "Acme Corp",
      contactName: "Jane Doe",
      contactEmail: "not-an-email",
    });

    expect(result.success).toBe(false);
  });
});
