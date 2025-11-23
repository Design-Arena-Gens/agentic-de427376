import { NextResponse } from "next/server";
import { z } from "zod";
import { generateReply } from "@/lib/agent";
import { AutomationRule } from "@/lib/types";

const ruleSchema = z.object({
  id: z.string(),
  label: z.string(),
  keywords: z.array(z.string()),
  responseTemplate: z.string(),
  platforms: z.array(z.enum(["facebook", "instagram"])),
  priority: z.number(),
});

const settingsSchema = z.object({
  defaultResponse: z.string(),
  tone: z.enum(["friendly", "professional", "short", "detailed"]),
  enableSmartReplies: z.boolean(),
});

const contextSchema = z.object({
  name: z.string().optional(),
  platform: z.enum(["facebook", "instagram"]),
  threadType: z.enum(["comment", "direct"]).default("direct"),
});

const requestSchema = z.object({
  incomingText: z.string().min(1),
  context: contextSchema,
  settings: settingsSchema,
  rules: z.array(ruleSchema),
});

export async function POST(req: Request) {
  try {
    const payload = requestSchema.parse(await req.json());

    const result = generateReply(
      payload.incomingText,
      payload.context,
      payload.settings,
      payload.rules as AutomationRule[]
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "ValidationError", details: error.flatten() },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
