let accessTokenMem: string | null = null;

export const setAccessTokenMem = (token: string | null): void => {
  accessTokenMem = token;
};

export const getAccessTokenMem = (): string | null => accessTokenMem;