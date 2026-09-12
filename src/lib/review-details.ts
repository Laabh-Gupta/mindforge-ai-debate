import { z } from "zod/v3";
export const ReviewDetailsSchema = z.object({
  keyClaims: z.array(z.string()),
  supportingEvidence: z.array(z.string()),
  strongestContribution: z.string(),
  weakestContribution: z.string(),
  bestCounterargument: z.string(),
  missedOpportunities: z.array(z.string()),
  answers: z.array(
    z.object({ question: z.string(), assessment: z.string(), improvement: z.string() }),
  ),
  recommendedTopic: z.string(),
});
export type ReviewDetails = z.infer<typeof ReviewDetailsSchema>;
