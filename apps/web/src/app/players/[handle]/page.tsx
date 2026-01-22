export default function ProfilePage({
  params: _params,
}: {
  params: Promise<{ handle: string }>;
}) {
  return (
    <main className="flex min-h-screen flex-col p-8">
      <h1 className="mb-6 text-3xl font-bold">Profile</h1>
      <p className="text-gray-600">User profile will be displayed here.</p>
    </main>
  );
}

