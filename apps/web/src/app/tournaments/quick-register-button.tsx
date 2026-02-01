"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RegisterModal } from "@/components/tournament/register-modal";

interface QuickRegisterButtonProps {
  tournamentId: number;
  tournamentSlug: string;
  tournamentName: string;
  isFull: boolean;
  isRegistered?: boolean;
}

export function QuickRegisterButton({
  tournamentId,
  tournamentSlug,
  tournamentName,
  isFull,
  isRegistered = false,
}: QuickRegisterButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Already registered - show link to tournament
  if (isRegistered) {
    return (
      <Link
        href={`/tournaments/${tournamentSlug}`}
        className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex h-7 min-w-[76px] items-center justify-center rounded-md px-3 text-xs font-medium transition-colors"
      >
        Registered
      </Link>
    );
  }

  if (isFull) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="min-w-[76px] text-xs"
      >
        Full
      </Button>
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
