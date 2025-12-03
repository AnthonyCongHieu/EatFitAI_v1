export interface AuthUserDto {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthTokensResponse {
  token: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  user?: AuthUserDto | null;
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
