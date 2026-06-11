const LOCAL_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '');
}

function parseOriginList(...values: Array<string | undefined>) {
  return [...new Set(
    values
      .flatMap((value) => (value ?? '').split(','))
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean),
  )];
}

export const allowedOrigins = parseOriginList(
  process.env.FRONTEND_URL,
  process.env.API_ALLOWED_ORIGIN,
  process.env.TRUSTED_ORIGINS,
  ...LOCAL_ORIGINS,
);

export const authBaseUrl =
  normalizeOrigin(process.env.BETTER_AUTH_URL ?? '') ||
  normalizeOrigin(process.env.API_BASE_URL ?? '') ||
  `http://localhost:${process.env.PORT ?? '3000'}`;

export const useSecureCookies = authBaseUrl.startsWith('https://');
