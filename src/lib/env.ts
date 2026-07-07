/**
 * Runtime environment configuration for client-side usage.
 * 
 * In Next.js, NEXT_PUBLIC_* variables are inlined at build time.
 * This module provides a way to override them at runtime via
 * a script tag injected by the server in the root layout.
 * 
 * This allows cPanel environment variables to work without rebuilding.
 */

declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

export function getPublicEnv(key: string): string {
  // 1. Check runtime-injected env (from server-rendered script tag)
  if (typeof window !== "undefined" && window.__ENV__?.[key]) {
    return window.__ENV__[key];
  }
  // 2. Fallback to build-time env (process.env)
  return process.env[key] || "";
}
