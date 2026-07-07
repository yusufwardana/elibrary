/**
 * Server component that injects public environment variables
 * into the client via a script tag.
 * 
 * This runs on the server where process.env reads real env vars
 * (e.g., from cPanel Environment Variables), then passes them
 * to the browser via window.__ENV__.
 */
export function EnvScript() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__ENV__ = ${JSON.stringify(envVars)};`,
      }}
    />
  );
}
