/**
 * Resolves the Street Vision API base URL at runtime.
 * Works in both Vite (standalone dev) and webpack (Curio canvas) contexts.
 */
export function getApiBase(): string {
  // 1. Explicit runtime override (set by the Curio lifecycle hook)
  if (typeof window !== 'undefined' && (window as any).__STREET_VISION_API__) {
    return (window as any).__STREET_VISION_API__;
  }
  // 2. Vite env var (works in standalone frontend dev)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  // 3. Hardcoded fallback
  return 'http://localhost:8000/api';
}
