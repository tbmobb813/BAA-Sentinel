import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Authorizes direct browser-to-Blob uploads. Deliberately has no
// onUploadCompleted callback -- that requires a publicly reachable URL for
// Vercel's infrastructure to call back to (same limitation the Clerk
// webhook has locally). Instead, the client calls createBaaRecord directly
// once upload() resolves -- see src/components/vendors/document-upload-form.tsx
// -- so BaaRecord creation goes through the same authenticated Server
// Action path as everything else in this app, no public-URL dependency.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
          throw new Error("Not authenticated");
        }

        const vendorId =
          clientPayload && typeof clientPayload === "string"
            ? (JSON.parse(clientPayload) as { vendorId?: string }).vendorId
            : undefined;
        if (!vendorId) {
          throw new Error("Missing vendorId");
        }

        const vendor = await prisma.vendor.findFirst({
          where: { id: vendorId, organizationId: orgId },
        });
        if (!vendor) {
          throw new Error("Vendor not found");
        }

        return {
          allowedContentTypes: ["application/pdf", "image/png", "image/jpeg"],
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ vendorId }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload authorization failed" },
      { status: 400 },
    );
  }
}
