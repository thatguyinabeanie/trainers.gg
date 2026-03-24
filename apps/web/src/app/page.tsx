import { redirect } from "next/navigation";

// Redirect root to tournaments — feed is hidden until ready for release
export default function RootPage() {
  redirect("/tournaments");
}
