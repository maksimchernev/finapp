import { Router } from 'express';
import passport from 'passport';
import { generateToken, verifyToken } from '../services/jwt.service';

const router = Router();

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    const { id, email } = req.user!;
    const token = generateToken({ userId: id, email });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

router.get(
  '/yandex',
  passport.authenticate('yandex', { session: false })
);

router.get(
  '/yandex/callback',
  passport.authenticate('yandex', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=yandex_auth_failed`,
  }),
  (req, res) => {
    const { id, email } = req.user!;
    const token = generateToken({ userId: id, email });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ valid: false });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    res.json({ valid: true, userId: decoded.userId });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

export default router;
