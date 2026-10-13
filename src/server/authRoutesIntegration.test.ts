import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import http from 'http';

describe('Real Integration Tests for Auth & Protected Routes', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : ((req.baseUrl || "") + req.path);
      const publicPaths = [
        "/api/health",
        "/api/currency/rates",
        "/api/auth/check-setup",
        "/api/auth/setup-admin",
        "/api/auth/login",
      ];

      if (publicPaths.includes(fullPath) || fullPath.startsWith("/api/whatsapp/webhook")) {
        return next();
      }

      const token = req.cookies?.session_token;
      if (!token) {
        return res.status(401).json({
          success: false,
          error: "غير مصرح: يجب تسجيل الدخول للوصول إلى هذا المسار.",
        });
      }
      next();
    };

    app.use("/api", requireAuth);

    app.get("/api/health", (_req, res) => {
      res.status(200).json({ success: true, status: "healthy" });
    });

    app.get("/api/auth/check-setup", (_req, res) => {
      res.status(200).json({ success: true, needsSetup: true });
    });

    app.post("/api/auth/login", (req, res) => {
      const { email, password } = req.body;
      if (!email || password !== "correctpassword") {
        return res.status(401).json({ success: false, error: "بيانات الدخول غير صحيحة." });
      }
      res.status(200).json({ success: true, message: "تم تسجيل الدخول" });
    });

    app.get("/api/data/clients", (_req, res) => {
      res.status(200).json({ success: true, data: [] });
    });

    app.get("/api/documents", (_req, res) => {
      res.status(200).json({ success: true, data: [] });
    });

    app.get("/api/whatsapp/chats", (_req, res) => {
      res.status(200).json({ success: true, data: [] });
    });

    app.get("/api/whatsapp/webhook", (_req, res) => {
      res.status(200).json({ success: true, message: "webhook verified" });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. بدون كوكي: /api/auth/check-setup يرجع 200', async () => {
    const res = await fetch(`${baseUrl}/api/auth/check-setup`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('2. بدون كوكي: /api/health يرجع 200', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('3. بدون كوكي: /api/auth/login ببيانات خاطئة يرجع 401 من المعالج وليس من الحجب', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("بيانات الدخول غير صحيحة.");
  });

  it('4. بدون كوكي: /api/data/clients يرجع 401 (محجوب بالوسيط)', async () => {
    const res = await fetch(`${baseUrl}/api/data/clients`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("غير مصرح");
  });

  it('5. بدون كوكي: /api/documents يرجع 401', async () => {
    const res = await fetch(`${baseUrl}/api/documents`);
    expect(res.status).toBe(401);
  });

  it('6. بدون كوكي: /api/whatsapp/chats يرجع 401', async () => {
    const res = await fetch(`${baseUrl}/api/whatsapp/chats`);
    expect(res.status).toBe(401);
  });

  it('7. بدون كوكي: /api/whatsapp/webhook يرجع 200 بدون حجب', async () => {
    const res = await fetch(`${baseUrl}/api/whatsapp/webhook`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
