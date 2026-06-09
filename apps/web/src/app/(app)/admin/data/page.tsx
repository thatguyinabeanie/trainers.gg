import { ExternalData } from "@/components/admin/external-data";

// importLimitlessTournament can be slow on large events — extend the Vercel
// function timeout beyond the 60s default so manual per-row imports complete.
export const maxDuration = 300;

export default function DataAdminPage() {
  return <ExternalData />;
}
