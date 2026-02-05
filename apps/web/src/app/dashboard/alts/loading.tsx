import { Loader2 } from "lucide-react";

export default function AltsLoading() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}
