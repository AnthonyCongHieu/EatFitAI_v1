export interface AuthUserDto {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthTokensResponse {
  // Backend có thể trả accessToken hoặc token (JsonPropertyName)
  token?: string;
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  accessTokenExpiresAt?: string | null; // JsonPropertyName alias
  refreshTokenExpiresAt?: string | null;
  user?: AuthUserDto | null;
  needsOnboarding?: boolean;
}

export interface AuthSessionSuccessResult {
  type: 'success';
  params?: Record<string, string | undefined>;
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}
