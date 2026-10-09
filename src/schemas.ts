import { z } from "zod";
import { flagEnum } from "./flag.js";

// Zod schema for patient validation
const patientCreateSchema = z
  .object({
    name: z.string().nonempty(),
    species: z.string().nonempty(),
  })
  .strict();
const patientSchema = patientCreateSchema.extend({
  id: z.uuid(),
});
type Patient = z.infer<typeof patientSchema>;

// Zod schema for lab result validation
const labResultCreateSchema = z
  .object({
    patientId: z.uuid(),
    testCode: z.string().nonempty(),
    value: z.number(),
    unit: z.string().nonempty(),
    referenceLow: z.number().optional(),
    referenceHigh: z.number().optional(),
    collectedAt: z.iso.datetime(),
  })
  .refine(
    (data) => {
      if (data.referenceLow !== undefined && data.referenceHigh !== undefined) {
        return data.referenceLow <= data.referenceHigh;
      }
      return true;
    },
    {
      error: "Reference low cannot be greater than reference high",
      path: ["referenceLow"],
    },
  )
  .strict();
const labResultSchema = labResultCreateSchema.extend({
  id: z.uuid(),
  flag: flagEnum,
});
type LabResult = z.infer<typeof labResultSchema>;
type LabResultCreate = z.infer<typeof labResultCreateSchema>;

export type { Patient, LabResult, LabResultCreate };
export { patientCreateSchema, labResultCreateSchema };
