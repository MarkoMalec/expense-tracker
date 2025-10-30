import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(3).max(20),
  icon: z.string().max(20),
  type: z.enum(["income", "expense"]),
  description: z.string().max(255).optional(),
});

export type CreateCategorySchemaType = z.infer<typeof CreateCategorySchema>;

export const DeleteCategorySchema = z.object({
  name: z.string().min(3).max(20),
  type: z.enum(["income", "expense"]),
  description: z.string().max(255).optional(),
});

export type DeleteCategorySchemaType = z.infer<typeof DeleteCategorySchema>;

export const UpdateCategorySchema = z.object({
  name: z.string().min(3).max(20),
  icon: z.string().max(20),
  type: z.enum(["income", "expense"]),
  originalName: z.string().min(3).max(20), // To identify which category to update
  description: z.string().max(255).optional(),
});

export type UpdateCategorySchemaType = z.infer<typeof UpdateCategorySchema>;
