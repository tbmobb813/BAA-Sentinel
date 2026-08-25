"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { upload } from "@vercel/blob/client";
import { createBaaRecord } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DocumentUploadForm({ vendorId }: { vendorId: string }) {
  const [uploading, startUploading] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signedDate, setSignedDate] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    startUploading(async () => {
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          clientPayload: JSON.stringify({ vendorId }),
        });

        await createBaaRecord({
          vendorId,
          fileUrl: blob.url,
          label: file.name,
          signedDate: signedDate || undefined,
        });
        setSignedDate("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="signedDate">Signed date (optional)</Label>
          <Input
            id="signedDate"
            type="date"
            value={signedDate}
            onChange={(e) => setSignedDate(e.target.value)}
            disabled={uploading}
          />
        </div>
        <div>
          <Button
            disabled={uploading}
            nativeButton={false}
            render={<label htmlFor="document-file" className="cursor-pointer" />}
          >
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
          <input
            id="document-file"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
