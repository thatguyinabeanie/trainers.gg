import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-primary-600">
          trainers.gg
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          The social platform for Pokemon trainers, powered by Bluesky
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/home"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Enter the Community
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Learn More
          </Link>
        </div>

        <nav className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <Link href="/tournaments" className="hover:text-primary-600">
            Tournaments
          </Link>
          <Link href="/draft-leagues" className="hover:text-primary-600">
            Draft Leagues
          </Link>
          <Link href="/teams" className="hover:text-primary-600">
            Team Builder
          </Link>
        </nav>
      </div>
    </main>
  );
}
