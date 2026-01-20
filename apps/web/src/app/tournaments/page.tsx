import Link from "next/link";

export default function TournamentsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 text-6xl">🏆</div>
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Tournaments Coming Soon
        </h1>
        <p className="mb-8 text-gray-600">
          Organize and participate in Pokemon tournaments. Track brackets,
          standings, and compete with trainers worldwide.
        </p>
        <Link
          href="/"
          className="text-primary-600 hover:text-primary-700 hover:underline"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
