const defaultProductionOrigins = ['https://sparkquest-makerlab.vercel.app'];
const defaultLocalOrigins = ['http://127.0.0.1:5174', 'http://localhost:5174'];
const defaultEdufyOrigins = ['https://edufy-makerlab.vercel.app'];
const defaultLocalEdufyOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'];

const configuredOrigins = () => String(process.env.SPARKQUEST_ALLOWED_ORIGINS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

export const allowedSparkQuestOrigins = () => new Set([
  ...defaultProductionOrigins,
  ...configuredOrigins(),
  ...(process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' ? [] : defaultLocalOrigins),
]);

export const applySparkQuestCors = (req, res) => {
  const origin = req.headers?.origin;
  if (origin && allowedSparkQuestOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    return origin;
  }
  return null;
};

export const applyEdufyCors = (req, res) => {
  const origin = req.headers?.origin;
  const configured = String(process.env.EDUFY_ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const allowed = new Set([
    ...defaultEdufyOrigins,
    ...configured,
    ...(process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production' ? [] : defaultLocalEdufyOrigins),
  ]);
  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Edufy-Id-Token, X-Edufy-Organization-Id');
    res.setHeader('Access-Control-Max-Age', '600');
    return origin;
  }
  return null;
};

export const resolveSparkQuestAppUrl = (req) => {
  const requestOrigin = req.headers?.origin;
  const localRequest = requestOrigin === 'http://127.0.0.1:5173' || requestOrigin === 'http://localhost:5173';
  if (localRequest && process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production') {
    return process.env.SPARKQUEST_LOCAL_URL || 'http://127.0.0.1:5174';
  }
  return process.env.SPARKQUEST_APP_URL || 'https://sparkquest-makerlab.vercel.app';
};
