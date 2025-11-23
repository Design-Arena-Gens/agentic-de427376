import { NextResponse } from "next/server";
import { z } from "zod";
import {
  replyToInstagramComment,
  replyToThread,
} from "@/lib/meta";

const requestSchema = z.object({
  platform: z.enum(["facebook", "instagram"]),
  targetId: z.string().min(1, "Target ID is required"),
  message: z.string().min(1, "Message cannot be empty"),
  accessToken: z.string().min(1, "Access token is required"),
  isComment: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const payload = requestSchema.parse(await req.json());

    const credentials = {
      accessToken: payload.accessToken,
    };

    const response =
      payload.platform === "instagram"
        ? await replyToInstagramComment(credentials, {
            commentId: payload.targetId,
            message: payload.message,
          })
        : await replyToThread(credentials, {
            targetId: payload.targetId,
            message: payload.message,
            isComment: payload.isComment,
          });

    return NextResponse.json(response);
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
