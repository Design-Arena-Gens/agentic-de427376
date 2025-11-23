import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchInstagramComments } from "@/lib/meta";

const requestSchema = z.object({
  instagramBusinessId: z.string().min(1, "Instagram Business Account ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
  limit: z.number().min(1).max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const payload = requestSchema.parse(await req.json());

    const comments = await fetchInstagramComments({
      accessToken: payload.accessToken,
      instagramBusinessId: payload.instagramBusinessId,
      limit: payload.limit,
    });

    return NextResponse.json({ comments });
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
