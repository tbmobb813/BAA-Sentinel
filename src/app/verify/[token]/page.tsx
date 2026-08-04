import { prisma } from "@/lib/prisma";
import { VerifyResponseForm } from "@/components/vendors/verify-response-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function VerifyPage({
  params,
}: PageProps<"/verify/[token]">) {
  const { token } = await params;

  const request = await prisma.verificationRequest.findUnique({
    where: { token },
    include: { vendor: true },
  });

  if (request && request.status === "SENT") {
    await prisma.verificationRequest.update({
      where: { token },
      data: { status: "OPENED" },
    });
  }

  const expired = request ? request.expiresAt < new Date() : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Annual BAA verification</CardTitle>
          {request ? (
            <CardDescription>
              Requested by {request.vendor.name}&rsquo;s covered entity · due{" "}
              {request.dueDate.toLocaleDateString()}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {!request ? (
            <p className="text-sm text-destructive">
              This verification link is invalid.
            </p>
          ) : expired ? (
            <p className="text-sm text-destructive">
              This verification link has expired. Please contact the practice
              directly for a new one.
            </p>
          ) : request.status === "COMPLETED" ? (
            <p className="text-sm text-muted-foreground">
              This verification cycle has already been completed. Thank you.
            </p>
          ) : (
            <VerifyResponseForm token={token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
