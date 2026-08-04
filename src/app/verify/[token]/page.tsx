import { createClient } from "@/lib/supabase/server";
import { VerifyResponseForm } from "@/components/vendors/verify-response-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function VerifyPage({
  params,
}: PageProps<"/verify/[token]">) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_verification_request", { p_token: token })
    .maybeSingle();

  const request = error ? null : data;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Annual BAA verification</CardTitle>
          {request ? (
            <CardDescription>
              Requested by {request.vendor_name}&rsquo;s covered entity · due{" "}
              {request.due_date}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {!request ? (
            <p className="text-sm text-destructive">
              This verification link is invalid.
            </p>
          ) : request.expired ? (
            <p className="text-sm text-destructive">
              This verification link has expired. Please contact the practice
              directly for a new one.
            </p>
          ) : request.status === "verified" || request.status === "responded" ? (
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
