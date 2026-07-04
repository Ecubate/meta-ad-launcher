import { Store, type SessionData } from 'express-session';
import { prisma } from './db.js';

/**
 * express-session store backed by our Prisma DB, so sessions survive server
 * restarts and work across multiple instances. Works on SQLite (dev) and
 * Postgres (prod) unchanged.
 */
export class PrismaSessionStore extends Store {
  private expiryFor(sess: SessionData): Date {
    const c = sess.cookie?.expires;
    return c ? new Date(c) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  get(sid: string, cb: (err: any, session?: SessionData | null) => void) {
    prisma.session
      .findUnique({ where: { id: sid } })
      .then((row) => {
        if (!row) return cb(null, null);
        if (row.expiresAt < new Date()) {
          prisma.session.deleteMany({ where: { id: sid } }).catch(() => {});
          return cb(null, null);
        }
        cb(null, JSON.parse(row.data) as SessionData);
      })
      .catch((e) => cb(e));
  }

  set(sid: string, sess: SessionData, cb?: (err?: any) => void) {
    const data = JSON.stringify(sess);
    const expiresAt = this.expiryFor(sess);
    prisma.session
      .upsert({ where: { id: sid }, update: { data, expiresAt }, create: { id: sid, data, expiresAt } })
      .then(() => cb?.())
      .catch((e) => cb?.(e));
  }

  destroy(sid: string, cb?: (err?: any) => void) {
    prisma.session.deleteMany({ where: { id: sid } }).then(() => cb?.()).catch((e) => cb?.(e));
  }

  touch(sid: string, sess: SessionData, cb?: (err?: any) => void) {
    prisma.session
      .updateMany({ where: { id: sid }, data: { expiresAt: this.expiryFor(sess) } })
      .then(() => cb?.())
      .catch(() => cb?.());
  }
}
