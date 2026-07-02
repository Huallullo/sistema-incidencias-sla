import '@testing-library/jest-dom';

// Set mock Supabase environment variables for Jest test environment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dokdnmdqckwrlcfkuabt.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_mock';
process.env.MY_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRva2RubWRxY2t3cmxjZmt1YWJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTY2MzA5NSwiZXhwIjoyMDk3MjM5MDk1fQ.dup2KjYhCCeFfBzZ85SPAHLObbF0uNfFQCPCgQAm0NU';