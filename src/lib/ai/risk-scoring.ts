import "server-only";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "@/lib/anthropic";

const RiskAssessment = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string(),
});

export type RiskAssessment = z.infer<typeof RiskAssessment>;

// Growth/MSP-tier feature -- gated by plan at the call site, not here, so
// this stays a pure "given text, return an assessment" function.
export async function scoreVendorRisk({
  vendorName,
  responseSummary,
}: {
  vendorName: string;
  responseSummary: string;
}): Promise<RiskAssessment | null> {
  if (!anthropic) return null;

  const message = await anthropic.messages.parse({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system:
      "You are a HIPAA compliance risk analyst. Given a vendor's self-reported " +
      "description of their security safeguards, assess how much risk this vendor " +
      "poses to a covered entity's compliance posture. Score 0 (no discernible risk " +
      "-- safeguards described are strong, specific, and verifiable) to 100 (high " +
      "risk -- safeguards are vague, absent, or concerning). Judge only what is " +
      "actually stated: vague, generic, or boilerplate answers should score as " +
      "higher risk rather than receive the benefit of the doubt.",
    messages: [
      {
        role: "user",
        content: `Vendor: ${vendorName}\n\nSelf-reported safeguards:\n${responseSummary}`,
      },
    ],
    output_config: { format: zodOutputFormat(RiskAssessment) },
  });

  return message.parsed_output;
}
