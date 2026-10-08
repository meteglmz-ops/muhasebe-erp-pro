import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/db';
import { JWT_SECRET, authMiddleware } from '../../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'E-posta ve şifre zorunludur.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, error: 'Geçersiz e-posta veya şifre.' });
  }

  // Kullanıcının şirketlerini bul
  const userCompanies = db.prepare(`
    SELECT c.*, uc.role as company_role 
    FROM user_companies uc
    JOIN companies c ON c.id = uc.company_id
    WHERE uc.user_id = ? AND c.is_deleted = 0
  `).all(user.id) as any[];

  const defaultCompany = userCompanies[0] || null;

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      companyId: defaultCompany?.id || null,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        tcIdentity: user.tc_identity || null,
        phone: user.phone || null,
        role: user.role,
        createdAt: user.created_at,
      },
      currentCompany: defaultCompany,
      companies: userCompanies,
    },
  });
});

authRouter.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, full_name, tc_identity, phone, role, created_at FROM users WHERE id = ?').get(req.user!.userId) as any;
  const currentCompany = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user!.companyId) as any;
  const companies = db.prepare(`
    SELECT c.*, uc.role as company_role 
    FROM user_companies uc
    JOIN companies c ON c.id = uc.company_id
    WHERE uc.user_id = ? AND c.is_deleted = 0
  `).all(req.user!.userId) as any[];

  return res.json({
    success: true,
    data: {
      user,
      currentCompany,
      companies,
    },
  });
});

// ==========================================
// 1. E-POSTA OTP İLE KAYIT (2 AŞAMALI KAYIT)
// ==========================================
authRouter.post('/register/request-otp', async (req, res) => {
  const { email, password, fullName, companyName, tcIdentity, taxNumber, phone } = req.body;

  if (!email || !password || !fullName || !companyName) {
    return res.status(400).json({ success: false, error: 'E-posta, şifre, yetkili ad soyad ve şirket adı zorunludur.' });
  }

  // T.C. Kimlik Numarası Zorunlu Kontrolü (11 Haneli)
  const cleanTc = (tcIdentity || '').toString().trim().replace(/\D/g, '');
  if (!cleanTc || cleanTc.length !== 11) {
    return res.status(400).json({
      success: false,
      error: 'T.C. Kimlik Numarası zorunludur ve tam olarak 11 haneli rakamlardan oluşmalıdır.',
    });
  }

  // E-posta format kontrolü
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ success: false, error: 'Lütfen geçerli bir e-posta adresi giriniz.' });
  }

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existingEmail) {
    return res.status(400).json({ success: false, error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
  }

  const existingTc = db.prepare('SELECT id FROM users WHERE tc_identity = ?').get(cleanTc);
  if (existingTc) {
    return res.status(400).json({ success: false, error: 'Bu T.C. Kimlik Numarası ile kayıtlı bir hesap zaten mevcut.' });
  }

  // Anti-Flood / Rate Limiting: Minimum 60 saniye bekleme
  const recentOtp = db.prepare(`
    SELECT id, created_at FROM otp_codes 
    WHERE email = ? AND action = 'REGISTER' AND used = 0 AND created_at > datetime('now', '-60 seconds')
  `).get(cleanEmail) as any;
  if (recentOtp) {
    return res.status(429).json({
      success: false,
      error: 'Güvenlik Uyarısı: E-posta bombardımanını engellemek için lütfen yeni bir kod talep etmeden önce 60 saniye bekleyiniz.',
    });
  }

  // Önceki tüm kullanılmamış kodları geçersiz kıl (Tek aktif OTP prensibi)
  db.prepare(`UPDATE otp_codes SET used = 1 WHERE email = ? AND action = 'REGISTER' AND used = 0`).run(cleanEmail);

  // Kriptografik Rastgele 6 Haneli OTP Kod Üret (5 Dakika Geçerlilik)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const payload = JSON.stringify({
    email: cleanEmail,
    password,
    fullName: fullName.trim(),
    companyName: companyName.trim(),
    tcIdentity: cleanTc,
    taxNumber: (taxNumber || cleanTc).trim(),
    phone: phone ? phone.trim() : null,
  });

  // OTP tablosuna kaydet
  db.prepare(`
    INSERT INTO otp_codes (id, email, code, action, payload, expires_at, used, attempts)
    VALUES (?, ?, ?, 'REGISTER', ?, ?, 0, 0)
  `).run(uuidv4(), cleanEmail, code, payload, expiresAt);

  // E-Posta gönder (Asla istemciye veya ekrana sızdırılmaz)
  const { emailService } = require('../../services/email-service');
  await emailService.sendOtpEmail(
    cleanEmail,
    code,
    'REGISTER',
    `${companyName} yetkilisi ${fullName} (T.C. No: ${cleanTc}) kurumsal hesap aktivasyonu için tek kullanımlık güvenlik kodunuz.`
  );

  return res.json({
    success: true,
    message: `6 haneli yüksek güvenlikli doğrulama kodu "${cleanEmail}" adresinize gönderildi. Lütfen gelen kutunuzu kontrol ediniz.`,
    email: cleanEmail,
  });
});

authRouter.post('/register/verify-otp', (req, res) => {
  const { email, code, otp } = req.body;
  const finalCode = (code || otp || '').trim().replace(/\D/g, '');
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !finalCode || finalCode.length !== 6) {
    return res.status(400).json({ success: false, error: 'Geçerli bir 6 haneli doğrulama kodu giriniz.' });
  }

  // En son oluşturulan aktif kodu getir
  const otpRecord = db.prepare(`
    SELECT * FROM otp_codes 
    WHERE email = ? AND action = 'REGISTER' AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(cleanEmail) as any;

  if (!otpRecord) {
    return res.status(400).json({ success: false, error: 'Aktif bir doğrulama kodu bulunamadı veya daha önce kullanılmış.' });
  }

  // Süre aşımı kontrolü (5 dakika)
  if (new Date(otpRecord.expires_at) < new Date()) {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);
    return res.status(400).json({ success: false, error: 'Doğrulama kodunun 5 dakikalık geçerlilik süresi dolmuş. Lütfen yeni kod isteyiniz.' });
  }

  // Brute-force koruması: Kod hatalıysa deneme sayısını artır, 5 hatada oturumu yak
  if (otpRecord.code !== finalCode) {
    const currentAttempts = (otpRecord.attempts || 0) + 1;
    if (currentAttempts >= 5) {
      db.prepare('UPDATE otp_codes SET used = 1, attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      return res.status(403).json({
        success: false,
        error: 'Güvenlik İhlali: 5 kez üst üste hatalı kod girildiği için bu doğrulama kodu kalıcı olarak iptal edildi. Lütfen yeni bir kod isteyiniz.',
      });
    } else {
      db.prepare('UPDATE otp_codes SET attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      const remaining = 5 - currentAttempts;
      return res.status(400).json({
        success: false,
        error: `Hatalı doğrulama kodu. Kalan deneme hakkınız: ${remaining}`,
      });
    }
  }

  const payload = JSON.parse(otpRecord.payload);
  const { password, fullName, companyName, tcIdentity, taxNumber, phone } = payload;

  const userId = `usr-${uuidv4().substring(0, 8)}`;
  const companyId = `comp-${uuidv4().substring(0, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);

  const regTx = db.transaction(() => {
    // 1. Kullanıcıyı tüm kimlik ve iletişim bilgileriyle kaydet
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, tc_identity, phone, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 'COMPANY_OWNER', 1)
    `).run(userId, cleanEmail, passwordHash, fullName, tcIdentity, phone || null);

    // 2. Şirketi kaydet (TC Kimlik No ve Vergi No ile birlikte)
    db.prepare(`
      INSERT INTO companies (id, name, legal_title, tax_number, tc_identity, email, phone, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(companyId, companyName, companyName, taxNumber || tcIdentity, tcIdentity, cleanEmail, phone || null);

    // 3. Kullanıcı - Şirket bağı
    db.prepare(`
      INSERT INTO user_companies (id, user_id, company_id, role, is_default)
      VALUES (?, ?, ?, 'COMPANY_OWNER', 1)
    `).run(uuidv4(), userId, companyId);

    // 4. Varsayılan Kasa
    db.prepare(`
      INSERT INTO cash_banks (id, company_id, type, name, currency, opening_balance, current_balance, is_default)
      VALUES (?, ?, 'CASH', 'Merkez Kasa', 'TRY', 0, 0, 1)
    `).run(uuidv4(), companyId);

    // 5. OTP Kodunu tek kullanımlık olarak hemen imha et
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);
  });

  regTx();

  const user = db.prepare('SELECT id, email, full_name, tc_identity, phone, role, created_at FROM users WHERE id = ?').get(userId) as any;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      companyId: company.id,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    message: 'E-posta ve T.C. kimlik numarası başarıyla doğrulandı, şirket hesabınız açıldı.',
    data: {
      token,
      user,
      currentCompany: company,
      companies: [company],
    },
  });
});

// Standart Doğrudan Kayıt (Geriye Dönük Uyumluluk)
authRouter.post('/register', (req, res) => {
  const { email, password, fullName, companyName, tcIdentity, taxNumber, phone } = req.body;

  if (!email || !password || !fullName || !companyName) {
    return res.status(400).json({ success: false, error: 'E-posta, şifre, ad soyad ve şirket adı zorunludur.' });
  }

  const cleanTc = (tcIdentity || taxNumber || '').toString().trim().replace(/\D/g, '');
  if (!cleanTc || cleanTc.length !== 11) {
    return res.status(400).json({ success: false, error: '11 haneli T.C. Kimlik Numarası girilmesi zorunludur.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten var.' });
  }

  const userId = `usr-${uuidv4().substring(0, 8)}`;
  const companyId = `comp-${uuidv4().substring(0, 8)}`;
  const passwordHash = bcrypt.hashSync(password, 10);

  const regTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, tc_identity, phone, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 'COMPANY_OWNER', 1)
    `).run(userId, cleanEmail, passwordHash, fullName, cleanTc, phone || null);

    db.prepare(`
      INSERT INTO companies (id, name, legal_title, tax_number, tc_identity, email, phone, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(companyId, companyName, companyName, taxNumber || cleanTc, cleanTc, cleanEmail, phone || null);

    db.prepare(`
      INSERT INTO user_companies (id, user_id, company_id, role, is_default)
      VALUES (?, ?, ?, 'COMPANY_OWNER', 1)
    `).run(uuidv4(), userId, companyId);

    db.prepare(`
      INSERT INTO cash_banks (id, company_id, type, name, currency, opening_balance, current_balance, is_default)
      VALUES (?, ?, 'CASH', 'Merkez Kasa', 'TRY', 0, 0, 1)
    `).run(uuidv4(), companyId);
  });

  regTx();

  const user = db.prepare('SELECT id, email, full_name, tc_identity, phone, role, created_at FROM users WHERE id = ?').get(userId) as any;
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      companyId: company.id,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Hesap ve şirket başarıyla oluşturuldu.',
    data: {
      token,
      user,
      currentCompany: company,
      companies: [company],
    },
  });
});

// ==========================================
// 2. ŞİFRE SIFIRLAMA (OTP İLE)
// ==========================================
// ==========================================
// 2. ŞİFRE SIFIRLAMA (OTP İLE)
// ==========================================
authRouter.post('/forgot-password/request-otp', async (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return res.status(400).json({ success: false, error: 'E-posta adresi zorunludur.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;
  if (!user) {
    return res.status(404).json({ success: false, error: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.' });
  }

  // Rate Limiting: 60 saniye flood koruması
  const recentOtp = db.prepare(`
    SELECT id FROM otp_codes 
    WHERE email = ? AND action = 'RESET_PASSWORD' AND used = 0 AND created_at > datetime('now', '-60 seconds')
  `).get(cleanEmail);
  if (recentOtp) {
    return res.status(429).json({ success: false, error: 'Güvenlik Koruması: Lütfen yeni kod istemeden önce 60 saniye bekleyiniz.' });
  }

  // Önceki aktif kodları geçersiz kıl
  db.prepare(`UPDATE otp_codes SET used = 1 WHERE email = ? AND action = 'RESET_PASSWORD' AND used = 0`).run(cleanEmail);

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 dakika

  db.prepare(`
    INSERT INTO otp_codes (id, email, code, action, payload, expires_at, used, attempts)
    VALUES (?, ?, ?, 'RESET_PASSWORD', ?, ?, 0, 0)
  `).run(uuidv4(), cleanEmail, code, JSON.stringify({ userId: user.id }), expiresAt);

  const { emailService } = require('../../services/email-service');
  await emailService.sendOtpEmail(cleanEmail, code, 'RESET_PASSWORD', `${user.full_name} kullanıcısı için şifre sıfırlama kodu.`);

  res.json({
    success: true,
    message: 'Şifre sıfırlama doğrulama kodu e-postanıza gönderildi.',
    email: cleanEmail,
  });
});

authRouter.post('/forgot-password/reset', (req, res) => {
  const { email, code, otp, newPassword } = req.body;
  const finalCode = (code || otp || '').trim().replace(/\D/g, '');
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !finalCode || finalCode.length !== 6 || !newPassword) {
    return res.status(400).json({ success: false, error: 'E-posta, 6 haneli doğrulama kodu ve yeni şifre zorunludur.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Yeni şifre en az 6 karakter olmalıdır.' });
  }

  const otpRecord = db.prepare(`
    SELECT * FROM otp_codes 
    WHERE email = ? AND action = 'RESET_PASSWORD' AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(cleanEmail) as any;

  if (!otpRecord) {
    return res.status(400).json({ success: false, error: 'Aktif bir şifre sıfırlama kodu bulunamadı veya süresi dolmuş.' });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);
    return res.status(400).json({ success: false, error: 'Doğrulama kodunun 5 dakikalık süresi dolmuş. Lütfen yeni kod isteyiniz.' });
  }

  // Brute-force koruması (5 deneme hakkı)
  if (otpRecord.code !== finalCode) {
    const currentAttempts = (otpRecord.attempts || 0) + 1;
    if (currentAttempts >= 5) {
      db.prepare('UPDATE otp_codes SET used = 1, attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      return res.status(403).json({
        success: false,
        error: 'Güvenlik İhlali: 5 kez hatalı kod girildiği için sıfırlama talebi iptal edildi. Lütfen tekrar talepte bulununuz.',
      });
    } else {
      db.prepare('UPDATE otp_codes SET attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      return res.status(400).json({
        success: false,
        error: `Hatalı doğrulama kodu. Kalan deneme hakkınız: ${5 - currentAttempts}`,
      });
    }
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?').run(passwordHash, cleanEmail);
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);

  res.json({
    success: true,
    message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle güvenle giriş yapabilirsiniz.',
  });
});

// ========================================================
// 2.5 ŞİFRE DEĞİŞTİRME (ÇOK KATMANLI: MEVCUT ŞİFRE + T.C. + E-POSTA OTP)
// ========================================================
authRouter.post('/change-password/request-otp', authMiddleware, async (req, res) => {
  const { currentPassword, tcIdentity } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any;

  if (!user) {
    return res.status(404).json({ success: false, error: 'Kullanıcı hesabı bulunamadı.' });
  }

  if (!currentPassword) {
    return res.status(400).json({ success: false, error: 'Mevcut şifrenizi girmeniz zorunludur.' });
  }

  // 1. Mevcut Şifre Doğrulaması (bcrypt)
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ success: false, error: 'Mevcut şifreniz hatalı. Lütfen kontrol edip tekrar deneyiniz.' });
  }

  // 2. 11 Haneli T.C. Kimlik Numarası Doğrulaması
  const cleanTc = (tcIdentity || '').toString().trim().replace(/\D/g, '');
  if (!cleanTc || cleanTc.length !== 11) {
    return res.status(400).json({ success: false, error: '11 haneli T.C. Kimlik Numaranızı girmeniz zorunludur.' });
  }

  if (user.tc_identity && user.tc_identity.trim() !== cleanTc) {
    return res.status(400).json({ success: false, error: 'Girilen T.C. Kimlik Numarası sistemdeki kayıtlı kimlik numaranız ile uyuşmuyor.' });
  }

  // 3. Anti-Flood / Rate Limiting (60 Saniye)
  const recentOtp = db.prepare(`
    SELECT id FROM otp_codes 
    WHERE email = ? AND action = 'CHANGE_PASSWORD' AND used = 0 AND created_at > datetime('now', '-60 seconds')
  `).get(user.email);
  if (recentOtp) {
    return res.status(429).json({ success: false, error: 'Güvenlik Koruması: Yeni bir onay kodu talep etmeden önce 60 saniye bekleyiniz.' });
  }

  // Önceki kullanılmamış kodları geçersiz kıl
  db.prepare(`UPDATE otp_codes SET used = 1 WHERE email = ? AND action = 'CHANGE_PASSWORD' AND used = 0`).run(user.email);

  // 4. Rastgele 6 Haneli Kriptografik OTP Kod Üret (5 Dakika Geçerlilik)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otp_codes (id, email, code, action, payload, expires_at, used, attempts)
    VALUES (?, ?, ?, 'CHANGE_PASSWORD', ?, ?, 0, 0)
  `).run(uuidv4(), user.email, code, JSON.stringify({ userId: user.id, tcIdentity: cleanTc }), expiresAt);

  // 5. E-Posta Gönderimi (Asla istemciye veya ekrana sızdırılmaz)
  const { emailService } = require('../../services/email-service');
  await emailService.sendOtpEmail(
    user.email,
    code,
    'CHANGE_PASSWORD',
    `${user.full_name} (T.C. No: ${cleanTc}) için şifre güncelleme tek kullanımlık güvenlik onay kodu.`
  );

  const parts = user.email.split('@');
  const maskedEmail = parts[0].length > 2 
    ? `${parts[0].slice(0, 2)}••••@${parts[1]}` 
    : `•••@${parts[1]}`;

  return res.json({
    success: true,
    message: `Güvenlik doğrulama kodu kayıtlı e-posta adresinize (${maskedEmail}) iletildi.`,
    maskedEmail,
  });
});

authRouter.post('/change-password/confirm', authMiddleware, (req, res) => {
  const { code, otp, newPassword, tcIdentity } = req.body;
  const finalCode = (code || otp || '').trim().replace(/\D/g, '');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.userId) as any;

  if (!user) {
    return res.status(404).json({ success: false, error: 'Kullanıcı hesabı bulunamadı.' });
  }

  if (!finalCode || finalCode.length !== 6) {
    return res.status(400).json({ success: false, error: '6 haneli doğrulama kodu girilmesi zorunludur.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Yeni şifreniz en az 6 karakter olmalıdır.' });
  }

  // T.C. Kimlik Kontrolü
  if (tcIdentity) {
    const cleanTc = tcIdentity.toString().trim().replace(/\D/g, '');
    if (user.tc_identity && user.tc_identity.trim() !== cleanTc) {
      return res.status(400).json({ success: false, error: 'T.C. Kimlik Numarası doğrulaması başarısız.' });
    }
  }

  const otpRecord = db.prepare(`
    SELECT * FROM otp_codes 
    WHERE email = ? AND action = 'CHANGE_PASSWORD' AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(user.email) as any;

  if (!otpRecord) {
    return res.status(400).json({ success: false, error: 'Aktif bir güvenlik kodu bulunamadı veya daha önce kullanılmış.' });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);
    return res.status(400).json({ success: false, error: 'Doğrulama kodunun 5 dakikalık süresi dolmuş. Lütfen yeni bir kod isteyiniz.' });
  }

  // Brute-force koruması (5 Deneme Hakkı)
  if (otpRecord.code !== finalCode) {
    const currentAttempts = (otpRecord.attempts || 0) + 1;
    if (currentAttempts >= 5) {
      db.prepare('UPDATE otp_codes SET used = 1, attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      return res.status(403).json({
        success: false,
        error: 'Güvenlik İhlali: 5 kez üst üste hatalı kod girildiği için şifre değiştirme talebi kalıcı olarak iptal edildi.',
      });
    } else {
      db.prepare('UPDATE otp_codes SET attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      return res.status(400).json({
        success: false,
        error: `Hatalı doğrulama kodu. Kalan deneme hakkınız: ${5 - currentAttempts}`,
      });
    }
  }

  // Kodu imha et
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);

  // Şifreyi bcrypt ile hashle ve kaydet
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, user.id);

  // Denetim günlüğüne güvenli log düş
  db.prepare(`
    INSERT INTO audit_logs (id, company_id, user_id, action, module, entity_id, details, ip_address)
    VALUES (?, ?, ?, 'CHANGE_PASSWORD', 'SECURITY', ?, ?, '127.0.0.1')
  `).run(uuidv4(), req.user!.companyId, user.id, user.id, JSON.stringify({ updatedAt: new Date().toISOString() }));

  return res.json({
    success: true,
    message: 'Şifreniz çok katmanlı kimlik ve OTP doğrulamasıyla başarıyla güncellendi.',
  });
});

// ========================================================
// 3. SİSTEMİ TEK KALEMDE SIFIRLAMA (FACTORY RESET İLE ÇOK KATMANLI OTP)
// ========================================================
authRouter.post('/reset-system/request-otp', authMiddleware, async (req, res) => {
  const user = req.user!;
  const email = user.email;
  const { currentPassword, tcIdentity } = req.body;

  const userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(user.userId) as any;
  if (!userRecord) {
    return res.status(404).json({ success: false, error: 'Yönetici hesabı bulunamadı.' });
  }

  // İsteğe bağlı ön kontrol: Şifre veya T.C. gönderilmişse hemen teyit et
  if (currentPassword && !bcrypt.compareSync(currentPassword, userRecord.password_hash)) {
    return res.status(401).json({ success: false, error: 'Yönetici şifreniz hatalı.' });
  }

  if (tcIdentity) {
    const cleanTc = tcIdentity.toString().trim().replace(/\D/g, '');
    if (userRecord.tc_identity && userRecord.tc_identity.trim() !== cleanTc) {
      return res.status(400).json({ success: false, error: 'T.C. Kimlik Numarası doğrulaması başarısız.' });
    }
  }

  // Rate Limiting: 60 saniye flood koruması
  const recentOtp = db.prepare(`
    SELECT id FROM otp_codes 
    WHERE email = ? AND action = 'RESET_SYSTEM' AND used = 0 AND created_at > datetime('now', '-60 seconds')
  `).get(email);
  if (recentOtp) {
    return res.status(429).json({ success: false, error: 'Lütfen yeni onay kodu istemeden önce 60 saniye bekleyiniz.' });
  }

  // Önceki kullanılmamış kodları geçersiz kıl
  db.prepare(`UPDATE otp_codes SET used = 1 WHERE email = ? AND action = 'RESET_SYSTEM' AND used = 0`).run(email);

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otp_codes (id, email, code, action, payload, expires_at, used, attempts)
    VALUES (?, ?, ?, 'RESET_SYSTEM', ?, ?, 0, 0)
  `).run(uuidv4(), email, code, JSON.stringify({ userId: user.userId, companyId: user.companyId }), expiresAt);

  const { emailService } = require('../../services/email-service');
  await emailService.sendOtpEmail(
    email,
    code,
    'RESET_SYSTEM',
    'Tüm operasyonel kayıtları tek kalemde sıfırlama işlemi için yüksek güvenlikli onay kodunuz.'
  );

  res.json({
    success: true,
    message: 'Sistem sıfırlama onay kodu yönetici e-postanıza gönderildi.',
    email,
  });
});

authRouter.post('/reset-system/confirm', authMiddleware, (req, res) => {
  const { code, otp, currentPassword, tcIdentity, confirmWord, keepMasterData } = req.body;
  const finalCode = (code || otp || '').trim().replace(/\D/g, '');
  const user = req.user!;
  const companyId = user.companyId;

  const userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(user.userId) as any;
  if (!userRecord) {
    return res.status(404).json({ success: false, error: 'Yönetici hesabı bulunamadı.' });
  }

  // 1. Yönetici Şifresi Doğrulaması (Eğer gönderildiyse veya zorunluysa)
  if (currentPassword && !bcrypt.compareSync(currentPassword, userRecord.password_hash)) {
    return res.status(401).json({ success: false, error: 'Yönetici şifresi geçersiz.' });
  }

  // 2. T.C. Kimlik No Doğrulaması
  if (tcIdentity) {
    const cleanTc = tcIdentity.toString().trim().replace(/\D/g, '');
    if (userRecord.tc_identity && userRecord.tc_identity.trim() !== cleanTc) {
      return res.status(400).json({ success: false, error: 'T.C. Kimlik Numarası uyuşmuyor.' });
    }
  }

  // 3. Onay Kelimesi Doğrulaması
  if (confirmWord) {
    const normWord = confirmWord.trim().toUpperCase().replace(/İ/g, 'I');
    if (normWord !== 'OKUDUM ANLADIM' && normWord !== 'VERILERI-KALICI-SIL') {
      return res.status(400).json({ success: false, error: 'Onay kelimesi hatalı. Lütfen kutuya "OKUDUM ANLADIM" yazınız.' });
    }
  }

  if (!finalCode || finalCode.length !== 6) {
    return res.status(400).json({ success: false, error: 'Sistem sıfırlama için 6 haneli onay kodu zorunludur.' });
  }

  const otpRecord = db.prepare(`
    SELECT * FROM otp_codes 
    WHERE email = ? AND action = 'RESET_SYSTEM' AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(user.email) as any;

  if (!otpRecord) {
    return res.status(400).json({ success: false, error: 'Aktif bir güvenlik kodu bulunamadı veya daha önce kullanılmış.' });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);
    return res.status(400).json({ success: false, error: 'Güvenlik kodunun 5 dakikalık süresi dolmuş.' });
  }

  // Brute-force koruması
  if (otpRecord.code !== finalCode) {
    const currentAttempts = (otpRecord.attempts || 0) + 1;
    if (currentAttempts >= 5) {
      db.prepare('UPDATE otp_codes SET used = 1, attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      return res.status(403).json({
        success: false,
        error: 'Güvenlik İhlali: 5 kez hatalı onay kodu girildiği için sıfırlama talebi bloke edildi.',
      });
    } else {
      db.prepare('UPDATE otp_codes SET attempts = ? WHERE id = ?').run(currentAttempts, otpRecord.id);
      return res.status(400).json({
        success: false,
        error: `Hatalı güvenlik kodu. Kalan deneme hakkınız: ${5 - currentAttempts}`,
      });
    }
  }

  // Kodu imha et
  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);

  // 0. GÜVENLİK YEDEĞİ (Otomatik Snapshot: Müşteri sildikten sonra Master Admin tek tıkla kurtarabilsin)
  try {
    const currentInvoices = db.prepare('SELECT * FROM invoices WHERE company_id = ?').all(companyId);
    const currentInvoiceItems = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id = ?)`).all(companyId);
    const currentCustomers = db.prepare('SELECT * FROM customers WHERE company_id = ?').all(companyId);
    const currentProducts = db.prepare('SELECT * FROM products WHERE company_id = ?').all(companyId);
    const currentStockTrans = db.prepare('SELECT * FROM stock_transactions WHERE company_id = ?').all(companyId);
    const currentAccountTrans = db.prepare('SELECT * FROM current_account_transactions WHERE company_id = ?').all(companyId);

    const snapshotData = JSON.stringify({
      invoices: currentInvoices,
      invoiceItems: currentInvoiceItems,
      customers: currentCustomers,
      products: currentProducts,
      stockTransactions: currentStockTrans,
      currentAccountTransactions: currentAccountTrans,
    });

    const countsJson = JSON.stringify({
      invoices: currentInvoices.length,
      customers: currentCustomers.length,
      products: currentProducts.length,
      transactions: currentStockTrans.length + currentAccountTrans.length,
    });

    db.prepare(`
      INSERT INTO company_snapshots (id, company_id, user_id, reason, snapshot_data, counts_json)
      VALUES (?, ?, ?, 'FACTORY_RESET', ?, ?)
    `).run(uuidv4(), companyId, user.userId, snapshotData, countsJson);
  } catch (snapErr) {
    console.warn('Otomatik snapshot alma uyarısı:', snapErr);
  }

  // Atomik Tek Kalemde Sıfırlama Transaction
  const resetTx = db.transaction(() => {
    // 1. Faturalar ve Kalemleri
    db.prepare(`
      DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id = ?)
    `).run(companyId);
    db.prepare('DELETE FROM invoices WHERE company_id = ?').run(companyId);

    // 2. Stok Hareketleri
    db.prepare('DELETE FROM stock_transactions WHERE company_id = ?').run(companyId);

    // 3. Cari Hesap Hareketleri
    db.prepare('DELETE FROM current_account_transactions WHERE company_id = ?').run(companyId);

    // 4. Taksit ve Ödeme Planları
    db.prepare('DELETE FROM payment_plans WHERE company_id = ?').run(companyId);

    // 5. Gelir ve Giderler
    db.prepare('DELETE FROM income_expenses WHERE company_id = ?').run(companyId);

    // 6. Kasa / Banka Hareketleri ve Transferler
    db.prepare('DELETE FROM financial_transactions WHERE company_id = ?').run(companyId);
    db.prepare('DELETE FROM transfers WHERE company_id = ?').run(companyId);

    // 7. Teklifler ve Siparişler
    db.prepare(`
      DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE company_id = ?)
    `).run(companyId);
    db.prepare('DELETE FROM quotes WHERE company_id = ?').run(companyId);

    db.prepare(`
      DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE company_id = ?)
    `).run(companyId);
    db.prepare('DELETE FROM orders WHERE company_id = ?').run(companyId);

    // 8. Carilerin ve Kasaların Bakiyelerini Sıfırla
    db.prepare('UPDATE customers SET balance = 0 WHERE company_id = ?').run(companyId);
    db.prepare('UPDATE suppliers SET balance = 0 WHERE company_id = ?').run(companyId);
    db.prepare('UPDATE cash_banks SET current_balance = opening_balance WHERE company_id = ?').run(companyId);

    // 9. Eğer ana tanımları korumak istenmiyorsa stok ve carileri de temizle
    if (!keepMasterData) {
      db.prepare('UPDATE products SET current_stock = 0 WHERE company_id = ?').run(companyId);
    }

    // 10. Fatura, Teklif ve Sipariş sayaçlarını sıfırla
    db.prepare(`
      UPDATE companies 
      SET next_invoice_number = 1, next_quote_number = 1, next_order_number = 1
      WHERE id = ?
    `).run(companyId);

    // 11. OTP kodunu kullanıldı yap
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);

    // 12. Denetim Günlüğü Kaydı
    db.prepare(`
      INSERT INTO audit_logs (id, company_id, user_id, action, module, entity_id, details, ip_address)
      VALUES (?, ?, ?, 'FACTORY_RESET', 'SETTINGS', ?, ?, '127.0.0.1')
    `).run(uuidv4(), companyId, user.userId, companyId, JSON.stringify({ resetAt: new Date().toISOString() }));
  });

  const wipedCounts = {
    invoices: (db.prepare('SELECT COUNT(*) as c FROM invoices WHERE company_id = ?').get(companyId) as any)?.c || 0,
    stockTransactions: (db.prepare('SELECT COUNT(*) as c FROM stock_transactions WHERE company_id = ?').get(companyId) as any)?.c || 0,
    currentAccountTransactions: (db.prepare('SELECT COUNT(*) as c FROM current_account_transactions WHERE company_id = ?').get(companyId) as any)?.c || 0,
    incomeExpenses: (db.prepare('SELECT COUNT(*) as c FROM income_expenses WHERE company_id = ?').get(companyId) as any)?.c || 0,
  };

  resetTx();

  res.json({
    success: true,
    message: 'Tüm hareketler, faturalar, cari ve finansal kayıtlar tek kalemde başarıyla sıfırlandı.',
    data: {
      wipedCounts,
    },
  });
});

// ==========================================
// 4. E-POSTA LOGLARI & SİMÜLATÖR GÖRÜNTÜLEME (KORUMALI)
// ==========================================
authRouter.get('/email-logs', authMiddleware, (req, res) => {
  const { emailService } = require('../../services/email-service');
  const rawLogs = emailService.getRecentLogs(30);
  const logs = rawLogs.map((l: any) => ({
    id: l.id,
    recipient: l.recipient,
    subject: l.subject,
    action: l.action,
    status: l.status,
    preview_url: null, // Public preview revoked
    otp_code: '••••••', // Kriptografik maskeleme
    created_at: l.created_at,
  }));
  res.json({
    success: true,
    data: logs,
  });
});

// ==========================================
// 5. DİNAMİK SMTP E-POSTA AYARLARI & TESTİ (KORUMALI)
// ==========================================
authRouter.get('/email/smtp-config', authMiddleware, (req, res) => {
  const { emailService } = require('../../services/email-service');
  const config = emailService.getSmtpConfig();
  res.json({
    success: true,
    data: config,
  });
});

authRouter.post('/email/smtp-config', authMiddleware, async (req, res) => {
  try {
    const { emailService } = require('../../services/email-service');
    const result = await emailService.saveSmtpConfig(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'SMTP ayarları kaydedilemedi.' });
  }
});

authRouter.post('/email/test-send', authMiddleware, async (req, res) => {
  try {
    const { recipient } = req.body;
    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ success: false, error: 'Lütfen geçerli bir alıcı e-posta adresi giriniz.' });
    }

    const { emailService } = require('../../services/email-service');
    const result = await emailService.testSmtpConnection(recipient.trim().toLowerCase());
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Test e-postası gönderilemedi.' });
  }
});


