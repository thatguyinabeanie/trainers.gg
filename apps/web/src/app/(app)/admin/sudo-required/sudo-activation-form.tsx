"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleSudoMode } from "@/lib/sudo/actions";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SudoActivationFormProps {
  redirectPath: string;
}

export function SudoActivationForm({ redirectPath }: SudoActivationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const result = await toggleSudoMode();
      if (result.success && result.isActive) {
        toast.success("Sudo mode activated", {
          description: "You now have elevated admin permissions.",
        });
        // Redirect to the originally requested admin page
        router.push(redirectPath);
      } else if (!result.success) {
        toast.error("Error", {
          description: result.error,
        });
      } else {
        toast.error("Error", {
          description: "Failed to activate sudo mode",
        });
      }
    } catch {
      toast.error("Error", {
        description: "Failed to activate sudo mode",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={handleActivate}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Activating...
          </>
        ) : (
          <>
            <ShieldAlert className="mr-2 h-5 w-5" />
            Activate Sudo Mode
          </>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={() => router.back()}
        disabled={loading}
        className="w-full"
      >
        Go Back
      </Button>
    </div>
  );
}
