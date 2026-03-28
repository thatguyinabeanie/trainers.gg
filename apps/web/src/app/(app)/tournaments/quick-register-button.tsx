"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { RegisterModal } from "@/components/tournament/register-modal";

interface QuickRegisterButtonProps {
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
  isFull: boolean;
  isRegistered?: boolean;
  isRegistrationClosed?: boolean;
}

export function QuickRegisterButton({
  tournamentId,
  tournamentSlug,
  tournamentName,
  isFull,
  isRegistered = false,
  isRegistrationClosed = false,
}: QuickRegisterButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Already registered - show checkmark + edit button
  if (isRegistered) {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="text-primary h-4 w-4" />
        <Button
          variant="outline"
          size="sm"
          className="min-w-[56px] text-xs"
          onClick={() => setOpen(true)}
        >
          Edit
        </Button>
        <RegisterModal
          open={open}
          onOpenChange={setOpen}
          tournamentId={tournamentId}
          tournamentSlug={tournamentSlug}
          tournamentName={tournamentName}
          isFull={isFull}
          mode="edit"
          onSuccess={() => router.refresh()}
        />
      </div>
    );
  }

  if (isRegistrationClosed) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="min-w-[76px] text-xs"
      >
        Closed
      </Button>
    );
  }

  if (isFull) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[76px] text-xs"
          onClick={() => setOpen(true)}
        >
          Waitlist
        </Button>
        <RegisterModal
          open={open}
          onOpenChange={setOpen}
          tournamentId={tournamentId}
          tournamentSlug={tournamentSlug}
          tournamentName={tournamentName}
          isFull={isFull}
          onSuccess={() => {
            router.push(`/tournaments/${tournamentSlug}`);
            router.refresh();
          }}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="min-w-[76px] text-xs"
        onClick={() => setOpen(true)}
      >
        Register
      </Button>
      <RegisterModal
        open={open}
        onOpenChange={setOpen}
        tournamentId={tournamentId}
        tournamentSlug={tournamentSlug}
        tournamentName={tournamentName}
        isFull={isFull}
        onSuccess={() => {
          router.push(`/tournaments/${tournamentSlug}`);
          router.refresh();
        }}
      />
    </>
  );
}
