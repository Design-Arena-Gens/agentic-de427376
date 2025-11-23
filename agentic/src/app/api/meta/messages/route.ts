import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchFacebookInbox } from "@/lib/meta";

const requestSchema = z.object({
  pageId: z.string().min(1, "Page ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
  limit: z.number().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const payload = requestSchema.parse(await req.json());

    const messages = await fetchFacebookInbox({
      accessToken: payload.accessToken,
      pageId: payload.pageId,
      limit: payload.limit,
    });

    return NextResponse.json({ messages });
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
