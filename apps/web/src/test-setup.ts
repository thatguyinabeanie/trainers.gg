import "@testing-library/jest-dom";

// Set required environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.NEXT_PUBLIC_PDS_HANDLE_DOMAIN = "trainers.gg";
