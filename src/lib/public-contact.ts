import { z } from "zod";

export const publicContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter your showroom or business name.").max(120),
  line1: z.string().trim().min(2, "Enter the public showroom address.").max(200),
  city: z.string().trim().min(2, "Enter the city.").max(100),
  phone: z.string().trim().transform((value) => value.replace(/[\s().-]/g, ""))
    .refine((value) => value === "" || /^\+[1-9]\d{7,14}$/.test(value), "Use an international number with country code, for example +919876543210."),
  hours: z.string().trim().max(200),
  appointmentOnly: z.boolean(),
});

export type PublicContactInput = z.input<typeof publicContactSchema>;
