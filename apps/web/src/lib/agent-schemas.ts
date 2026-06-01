import { z } from "zod";

export const CreateScheduleSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{42}$/, "Invalid Celo address format"),
  recipientPhone: z.string().optional().default(""),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.enum(["USDm"]).default("USDm"),
  frequency: z.enum(["One-time", "Weekly", "Monthly"]).default("Monthly"),
  startDate: z.string().min(1, "Start date is required"),
  hasMonthlyLimit: z.boolean().default(false),
  maxMonthlyAmount: z.number().nonnegative().optional().default(0),
});

export const ScheduleIdSchema = z.object({
  scheduleId: z.union([z.string(), z.number()]).transform((val) => String(val)),
});

export type CreateScheduleParams = z.infer<typeof CreateScheduleSchema>;
export type ScheduleIdParams = z.infer<typeof ScheduleIdSchema>;
