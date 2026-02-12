import { z } from "zod";

export const approveContractSchema = z.object({
  contractId: z.string().uuid("L'identifiant du contrat est invalide"),
});

export type ApproveContractData = z.infer<typeof approveContractSchema>;
