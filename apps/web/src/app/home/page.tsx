export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col p-8">
      <h1 className="mb-6 text-3xl font-bold">Home Feed</h1>
      <p className="text-gray-600">
        Your Pokemon community feed will appear here.
      </p>
      <p className="mt-4 text-sm text-gray-400">
        Sign in with Bluesky to see posts from trainers you follow.
      </p>
    </main>
  );
}
