// PKCE helpers (RFC 7636) for the browser-only Spotify auth flow (ADR-0003).

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

function randomBase64url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

/** A high-entropy PKCE code verifier (32 random bytes → 43 base64url chars). */
export function generateCodeVerifier(): string {
  return randomBase64url(32)
}

/** A random opaque value used to defend the OAuth callback against CSRF. */
export function generateState(): string {
  return randomBase64url(16)
}
