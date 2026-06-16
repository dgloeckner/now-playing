import { describe, it, expect } from 'vitest'
import { deriveCodeChallenge, generateCodeVerifier } from './pkce'

describe('PKCE', () => {
  // RFC 7636 Appendix B test vector.
  it('derives the code challenge as base64url(SHA-256(verifier))', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = await deriveCodeChallenge(verifier)
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('generates a URL-safe code verifier of RFC-compliant length', () => {
    const verifier = generateCodeVerifier()
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/) // base64url alphabet, no padding
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
  })
})
