import { Router } from 'express';
import passport from 'passport';
import { generateToken } from '../services/jwt.service';

const router = Router();

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    const user = req.user as any;
    const token = generateToken({ userId: user.id, email: user.email });
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Yandex OAuth
router.get(
  '/yandex',
  passport.authenticate('yandex', { 
    session: false,
  })
);

router.get(
  '/yandex/callback',
  passport.authenticate('yandex', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=yandex_auth_failed`,
  }),
  (req, res) => {
    const user = req.user as any;
    const token = generateToken({ userId: user.id, email: user.email });
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Verify token endpoint
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  try {
    const token = authHeader.substring(7);
    const { verifyToken } = require('../services/jwt.service');
    const decoded = verifyToken(token);
    
    res.json({ valid: true, userId: decoded.userId });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

export default router;
