"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleSudoMode } from "@/lib/sudo/actions";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SudoActivationFormProps {
  redirectPath: string;
}

export function SudoActivationForm({ redirectPath }: SudoActivationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const result = await toggleSudoMode();
      if (result.success && result.isActive) {
        toast({
          title: "Sudo mode activated",
          description: "You now have elevated admin permissions.",
        });
        // Redirect to the originally requested admin page
        router.push(redirectPath);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to activate sudo mode",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate sudo mode",
        variant: "destructive",
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
