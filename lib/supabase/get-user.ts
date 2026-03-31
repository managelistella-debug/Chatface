import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

// Extract authenticated user from a route handler request
export async function getUserFromRequest(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Route handlers can't set cookies on the original response here;
          // session refresh is handled by middleware on the next request
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
