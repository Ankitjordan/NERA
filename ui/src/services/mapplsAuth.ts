export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  project_code?: string;
  client_id?: string;
}

export async function requestMapplsOAuthToken(
  clientId: string,
  clientSecret: string
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
  });

  // Try direct endpoint first, fallback to Vite proxy if CORS blocks
  try {
    const res = await fetch('/api/mappls-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        data.error_description || data.error || `Authentication failed with status ${res.status}`
      );
    }

    return data as OAuthTokenResponse;
  } catch (err: any) {
    // If proxy failed, try direct outpost call
    const directRes = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const directData = await directRes.json();
    if (!directRes.ok || directData.error) {
      throw new Error(
        directData.error_description || directData.error || err.message || 'Token generation failed'
      );
    }

    return directData as OAuthTokenResponse;
  }
}
