import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as YandexStrategy } from 'passport-yandex';
import { PrismaClient } from '@prisma/client';
import { OAuthProfile } from '../types';

const prisma = new PrismaClient();

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName,
            picture: profile.photos?.[0]?.value,
            provider: 'google',
          };

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { providerId: `google_${oauthProfile.id}` },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: oauthProfile.email,
                name: oauthProfile.name,
                avatar: oauthProfile.picture,
                provider: 'google',
                providerId: `google_${oauthProfile.id}`,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

// Yandex OAuth Strategy
if (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET) {
  passport.use(
    new YandexStrategy(
      {
        clientID: process.env.YANDEX_CLIENT_ID,
        clientSecret: process.env.YANDEX_CLIENT_SECRET,
        callbackURL: process.env.YANDEX_CALLBACK_URL || '/api/auth/yandex/callback',
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const oauthProfile: OAuthProfile = {
            id: profile.id,
            email: profile.emails?.[0]?.value || profile.default_email || '',
            name: profile.displayName || profile.real_name,
            avatar: profile.default_avatar_id 
              ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
              : undefined,
            provider: 'yandex',
          };

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { providerId: `yandex_${oauthProfile.id}` },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: oauthProfile.email,
                name: oauthProfile.name,
                avatar: oauthProfile.avatar,
                provider: 'yandex',
                providerId: `yandex_${oauthProfile.id}`,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export default passport;
