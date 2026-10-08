import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';

export const JWT_SECRET = process.env.JWT_SECRET || 'beecursor-erp-super-secret-jwt-key-2026';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const companyIdHeader = req.headers['x-company-id'] as string;
  const queryToken = req.query.token as string | undefined;
  const queryCompanyId = req.query.companyId as string | undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Yetkilendirme jetonu bulunamadı. Lütfen giriş yapın.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Aktif şirket belirleme
    let activeCompanyId = companyIdHeader || queryCompanyId || decoded.companyId;

    if (!activeCompanyId) {
      const userCompany = db.prepare('SELECT company_id, role FROM user_companies WHERE user_id = ? ORDER BY is_default DESC LIMIT 1').get(decoded.userId) as any;
      if (userCompany) {
        activeCompanyId = userCompany.company_id;
      }
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      fullName: decoded.fullName,
      role: decoded.role || 'ACCOUNTANT',
      companyId: activeCompanyId || 'comp-beecursor-01'
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Oturum süresi doldu veya geçersiz. Lütfen tekrar giriş yapın.' });
  }
}

export function auditLog(companyId: string, userId: string | null, action: string, module: string, entityId: string | null, details: any, ip: string = '127.0.0.1') {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, action, module, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const { v4: uuidv4 } = require('uuid');
    stmt.run(uuidv4(), companyId, userId, action, module, entityId, JSON.stringify(details), ip);
  } catch (err) {
    console.error('Audit log kaydedilemedi:', err);
  }
}
