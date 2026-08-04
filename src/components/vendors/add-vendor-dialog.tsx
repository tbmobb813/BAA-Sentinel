"use client";

import { useActionState, useState } from "react";
import { createVendor, type ActionState } from "@/lib/actions/vendors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddVendorDialog({
  practices,
}: {
  practices: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createVendor,
    undefined,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Add vendor</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a vendor</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {practices.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="practiceId">Practice</Label>
              <Select name="practiceId" defaultValue={practices[0]?.id} required>
                <SelectTrigger id="practiceId">
                  <SelectValue placeholder="Select a practice" />
                </SelectTrigger>
                <SelectContent>
                  {practices.map((practice) => (
                    <SelectItem key={practice.id} value={practice.id}>
                      {practice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <input type="hidden" name="practiceId" value={practices[0]?.id ?? ""} />
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Vendor name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" name="contactName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceDescription">What do they do?</Label>
            <Textarea id="serviceDescription" name="serviceDescription" rows={3} />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
