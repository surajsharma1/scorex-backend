import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

export const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});
