import { z } from "zod";

export const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Enter a valid contact email"),
});
