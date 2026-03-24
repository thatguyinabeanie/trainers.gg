import { type z } from "zod";
import { createOrganizationSchema } from "./organization";

/**
 * Schema for submitting an organization request.
 * Same fields as createOrganizationSchema — name, slug, description.
 */
export const submitOrganizationRequestSchema = createOrganizationSchema;

export type SubmitOrganizationRequestInput = z.infer<
  typeof submitOrganizationRequestSchema
>;
