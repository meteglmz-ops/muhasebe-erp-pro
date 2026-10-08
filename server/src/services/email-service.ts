import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  action: string;
  code: string | null;
  status: string;
  preview_url: string | null;
  created_at: string;
}

export interface SmtpConfig {
  id?: string;
  provider: string; // 'gmail' | 'brevo' | 'outlook' | 'yandex' | 'custom'
  host: string;
  port: number;
  secure: boolean;
  auth_user: string;
  auth_pass?: string;
  from_name: string;
  from_email: string;
  is_active?: boolean;
}

// Initialize SQLite tables for email logs, OTP codes, and dynamic SMTP settings
export function initEmailAndOtpSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      action TEXT NOT NULL,
      code TEXT,
      status TEXT NOT NULL,
      preview_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS smtp_settings (
      id TEXT PRIMARY KEY,
      provider TEXT DEFAULT 'custom',
      host TEXT,
      port INTEGER DEFAULT 587,
      secure INTEGER DEFAULT 0,
      auth_user TEXT,
      auth_pass TEXT,
      from_name TEXT DEFAULT 'BeeCursor ERP',
      from_email TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_otp_search ON otp_codes(email, action, used);
    CREATE INDEX IF NOT EXISTS idx_email_logs_date ON email_logs(created_at DESC);
  `);

  // Migration: Ensure attempts column exists in otp_codes
  try {
    const otpColumns = db.prepare('PRAGMA table_info(otp_codes)').all() as any[];
    if (!otpColumns.some((col: any) => col.name === 'attempts')) {
      db.exec('ALTER TABLE otp_codes ADD COLUMN attempts INTEGER DEFAULT 0');
    }
  } catch (err) {
    console.warn('otp_codes migration note:', err);
  }
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isTestAccountReady = false;
  private isRealSmtpActive = false;
  private activeProviderName = 'Ethereal Sandbox';

  constructor() {
    try {
      initEmailAndOtpSchema();
    } catch (e) {
      // ignore
    }
    this.initTransporter();
  }

  public async initTransporter() {
    // 1. Check SQLite database for saved SMTP settings first
    try {
      const savedConfig = db
        .prepare('SELECT * FROM smtp_settings WHERE id = ? AND is_active = 1')
        .get('default_smtp') as any;

      if (savedConfig && savedConfig.host && savedConfig.auth_user && savedConfig.auth_pass) {
        const transportOpts: any =
          savedConfig.provider === 'gmail' || (savedConfig.host && savedConfig.host.includes('gmail'))
            ? {
                service: 'gmail',
                auth: {
                  user: savedConfig.auth_user,
                  pass: savedConfig.auth_pass,
                },
              }
            : {
                host: savedConfig.host,
                port: Number(savedConfig.port) || 587,
                secure: Boolean(savedConfig.secure),
                auth: {
                  user: savedConfig.auth_user,
                  pass: savedConfig.auth_pass,
                },
                tls: {
                  rejectUnauthorized: false, // Prevents certificate chain issues on shared relays
                },
              };

        this.transporter = nodemailer.createTransport(transportOpts);
        this.isRealSmtpActive = true;
        this.isTestAccountReady = false;
        this.activeProviderName = savedConfig.provider || 'Gmail';
        console.log(`📧 Aktif Canlı SMTP Bağlandı: [${this.activeProviderName}] (${savedConfig.auth_user})`);
        return;
      }
    } catch (err) {
      console.warn('Veritabanı SMTP kontrolünde uyarı:', err);
    }

    // 2. Check process.env SMTP credentials
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.isRealSmtpActive = true;
      this.isTestAccountReady = false;
      this.activeProviderName = 'Ortam Değişkeni (ENV)';
      console.log(`📧 ENV SMTP Sunucusu Bağlandı: ${process.env.SMTP_HOST} (${process.env.SMTP_USER})`);
      return;
    }

    // 3. Automated Fallback: Ethereal Test Account
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.isTestAccountReady = true;
      this.isRealSmtpActive = false;
      this.activeProviderName = 'Ethereal Test Sandbox';
      console.log('ℹ️ Gerçek SMTP yapılandırılmadı. Ethereal Test Servisi devrede (Kullanıcı:', testAccount.user, ')');
    } catch (err) {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.isRealSmtpActive = false;
      this.isTestAccountReady = false;
      this.activeProviderName = 'Yerel Simülatör';
      console.log('ℹ️ Yerel E-Posta Simülatörü Aktif');
    }
  }

  public getSmtpConfig(): any {
    try {
      const savedConfig = db
        .prepare('SELECT * FROM smtp_settings WHERE id = ?')
        .get('default_smtp') as any;

      if (savedConfig) {
        return {
          id: savedConfig.id,
          provider: savedConfig.provider || 'custom',
          host: savedConfig.host || '',
          port: Number(savedConfig.port) || 587,
          secure: Boolean(savedConfig.secure),
          auth_user: savedConfig.auth_user || '',
          auth_pass: savedConfig.auth_pass ? '••••••••••••••••' : '',
          from_name: savedConfig.from_name || 'BeeCursor ERP',
          from_email: savedConfig.from_email || savedConfig.auth_user || '',
          is_active: Boolean(savedConfig.is_active),
          isConfigured: Boolean(savedConfig.host && savedConfig.auth_user && savedConfig.auth_pass),
          isRealSmtpActive: this.isRealSmtpActive,
          activeProviderName: this.activeProviderName,
        };
      }
    } catch (err) {
      console.warn('getSmtpConfig hatası:', err);
    }

    return {
      provider: 'gmail',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_PORT === '465' || process.env.SMTP_SECURE === 'true',
      auth_user: process.env.SMTP_USER || '',
      auth_pass: process.env.SMTP_PASS ? '••••••••••••••••' : '',
      from_name: process.env.SMTP_FROM_NAME || 'BeeCursor ERP',
      from_email: process.env.SMTP_FROM || '',
      is_active: true,
      isConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
      isRealSmtpActive: this.isRealSmtpActive,
      activeProviderName: this.activeProviderName,
    };
  }

  public async saveSmtpConfig(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
    const existing = db.prepare('SELECT * FROM smtp_settings WHERE id = ?').get('default_smtp') as any;

    let finalPass = config.auth_pass;
    // Don't overwrite password if masked placeholder was sent
    if (!finalPass || finalPass.includes('••')) {
      finalPass = existing?.auth_pass || '';
    }

    const host = (config.host || '').trim();
    const auth_user = (config.auth_user || '').trim();
    const from_email = (config.from_email || auth_user).trim();
    const from_name = (config.from_name || 'BeeCursor ERP').trim();
    const port = Number(config.port) || 587;
    const secure = config.secure ? 1 : 0;
    const provider = config.provider || 'custom';

    if (existing) {
      db.prepare(`
        UPDATE smtp_settings
        SET provider = ?, host = ?, port = ?, secure = ?, auth_user = ?, auth_pass = ?, from_name = ?, from_email = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = 'default_smtp'
      `).run(provider, host, port, secure, auth_user, finalPass, from_name, from_email);
    } else {
      db.prepare(`
        INSERT INTO smtp_settings (id, provider, host, port, secure, auth_user, auth_pass, from_name, from_email, is_active)
        VALUES ('default_smtp', ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(provider, host, port, secure, auth_user, finalPass, from_name, from_email);
    }

    await this.initTransporter();

    return {
      success: true,
      message: 'SMTP E-Posta ayarları başarıyla kaydedildi ve servis güncellendi.',
    };
  }

  public async testSmtpConnection(targetEmail: string): Promise<{ success: boolean; message: string; error?: string }> {
    if (!targetEmail || !targetEmail.includes('@')) {
      return { success: false, message: 'Geçersiz test alıcı e-posta adresi.' };
    }

    try {
      if (!this.transporter) {
        await this.initTransporter();
      }

      const cfg = this.getSmtpConfig();
      const fromName = cfg.from_name || 'BeeCursor ERP Güvenlik';
      const fromEmail = cfg.from_email || cfg.auth_user || 'noreply@beecursor.com';
      const fromHeader = `"${fromName}" <${fromEmail}>`;

      const testCode = Math.floor(100000 + Math.random() * 900000).toString();

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">🚀 BeeCursor ERP - E-Posta Test İletisi</h2>
          <p>Tebrikler! SMTP sunucu yapılandırmanız başarıyla doğrulandı.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <span style="font-size: 13px; color: #64748b; display: block; margin-bottom: 4px;">Örnek Doğrulama Kodu (OTP):</span>
            <strong style="font-size: 28px; letter-spacing: 6px; color: #1e293b;">${testCode}</strong>
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Aktif Sağlayıcı: <strong>${this.activeProviderName}</strong><br>
            Gönderim Zamanı: ${new Date().toLocaleString('tr-TR')}
          </p>
        </div>
      `;

      const info = await this.transporter!.sendMail({
        from: fromHeader,
        to: targetEmail,
        subject: `[BeeCursor ERP] SMTP Test İletisi - Kod: ${testCode}`,
        html: htmlBody,
        text: `BeeCursor ERP Test iletisi başarıyla iletildi! Kod: ${testCode}`,
      });

      console.log(`✅ TEST E-POSTASI GÖNDERİLDİ: ${targetEmail} | Message ID:`, info.messageId);

      return {
        success: true,
        message: `Test e-postası başarıyla "${targetEmail}" adresine ulaştırıldı! Lütfen gelen kutunuzu (ve Spam klasörünü) kontrol ediniz.`,
      };
    } catch (err: any) {
      console.error('SMTP Test Gönderim Hatası:', err);
      return {
        success: false,
        message: 'E-posta gönderilemedi. Lütfen sunucu, port ve şifre bilgilerinizi kontrol ediniz.',
        error: err.message || String(err),
      };
    }
  }

  public async sendOtpEmail(
    to: string,
    code: string,
    action: 'REGISTER' | 'RESET_PASSWORD' | 'RESET_SYSTEM',
    extraDetails?: string
  ): Promise<{ success: boolean; previewUrl?: string; deliveryStatus: 'SENT' | 'SIMULATED' | 'FAILED'; isRealInbox: boolean; error?: string }> {
    const actionTitles = {
      REGISTER: 'Hesap Kayıt Doğrulama Kodu',
      RESET_PASSWORD: 'Şifre Sıfırlama Onay Kodu',
      RESET_SYSTEM: 'Sistemi Tek Kalemde Sıfırlama Güvenlik Kodu',
    };

    const actionColors = {
      REGISTER: '#2563eb',
      RESET_PASSWORD: '#ea580c',
      RESET_SYSTEM: '#dc2626',
    };

    const title = actionTitles[action] || 'Güvenlik Doğrulama Kodu';
    const accentColor = actionColors[action] || '#2563eb';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; padding: 32px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { border-bottom: 2px solid ${accentColor}; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .code-box { background: #f1f5f9; border: 2px dashed ${accentColor}; padding: 20px; text-align: center; margin: 24px 0; border-radius: 6px; }
          .code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: ${accentColor}; }
          .warning { font-size: 12px; color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; margin-top: 16px; font-weight: 600; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">${title}</h1>
            <div class="subtitle">BeeCursor ERP & Muhasebe Güvenlik Doğrulaması</div>
          </div>
          <p style="font-size: 13px; line-height: 1.6;">
            Merhaba,<br><br>
            Hesabınız veya sisteminiz üzerinden <strong>${title}</strong> talebinde bulunuldu.
            ${extraDetails ? `<br>${extraDetails}` : ''}
          </p>
          <div class="code-box">
            <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 6px; text-transform: uppercase;">6 Haneli Güvenlik Kodunuz</div>
            <div class="code">${code}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Bu kod 10 dakika boyunca geçerlidir.</div>
          </div>
          ${
            action === 'RESET_SYSTEM'
              ? '<div class="warning">DİKKAT: Bu kod kullanıldığında tüm hareket kayıtları, faturalar ve cari işlemler tek kalemde kalıcı olarak sıfırlanacaktır!</div>'
              : ''
          }
          <div class="footer">
            Bu e-posta BeeCursor ERP Güvenlik Servisi tarafından otomatik olarak oluşturulmuştur. Bu talebi siz yapmadıysanız lütfen bu iletiyi dikkate almayınız.
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `[BeeCursor ERP] ${title} - Kod: ${code}`;
    let previewUrl: string | undefined;

    try {
      if (!this.transporter) {
        await this.initTransporter();
      }

      const cfg = this.getSmtpConfig();
      const fromName = cfg.from_name || 'BeeCursor ERP Güvenlik';
      const fromEmail = cfg.from_email || cfg.auth_user || 'noreply@beecursor.com';
      const fromAddress = `"${fromName}" <${fromEmail}>`;

      const info = await this.transporter!.sendMail({
        from: fromAddress,
        to,
        subject,
        html: htmlBody,
        text: `BeeCursor ERP Doğrulama Kodunuz: ${code} (10 dakika geçerlidir)`,
      });

      if (this.isTestAccountReady) {
        previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      }

      console.log(`\n======================================================`);
      console.log(`📨 E-POSTA İŞLEMİ (${this.isRealSmtpActive ? 'GERÇEK INBOX' : 'TEST SANDBOX'}):`);
      console.log(`📍 Alıcı: ${to}`);
      console.log(`🔑 Doğrulama Kodu (OTP): [ ${code} ]`);
      console.log(`📌 İşlem: ${action} - ${title}`);
      console.log(`🏢 Sağlayıcı: ${this.activeProviderName}`);
      if (previewUrl) {
        console.log(`🔗 Ethereal Test Önizleme: ${previewUrl}`);
      }
      console.log(`======================================================\n`);

      // Log to database
      db.prepare(`
        INSERT INTO email_logs (id, recipient, subject, body, action, code, status, preview_url)
        VALUES (?, ?, ?, ?, ?, ?, 'SENT', ?)
      `).run(uuidv4(), to, subject, htmlBody, action, code, previewUrl || null);

      return {
        success: true,
        previewUrl,
        deliveryStatus: this.isRealSmtpActive ? 'SENT' : 'SIMULATED',
        isRealInbox: this.isRealSmtpActive,
      };
    } catch (err: any) {
      console.error('E-posta gönderim hatası:', err);

      // Still record in database so user can retrieve OTP code even if SMTP was unreachable
      db.prepare(`
        INSERT INTO email_logs (id, recipient, subject, body, action, code, status, preview_url)
        VALUES (?, ?, ?, ?, ?, ?, 'FAILED', ?)
      `).run(uuidv4(), to, subject, htmlBody, action, code, null);

      return {
        success: false,
        deliveryStatus: 'FAILED',
        isRealInbox: false,
        error: err.message,
      };
    }
  }

  public async sendMasterLoginAlert(to: string, ip: string): Promise<void> {
    const subject = `🚨 [ACİL GÜVENLİK UYARISI] BeeCursor Master Root Hesabına Giriş Başlatıldı!`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 32px; border-radius: 12px; border: 2px solid #ef4444;">
        <h1 style="color: #ef4444; margin-top: 0; font-size: 20px;">🚨 ACİL SİSTEM GÜVENLİK BİLDİRİMİ</h1>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Sayın Sistem Yöneticisi,<br><br>
          <strong>BeeCursor Master Root Yönetici Hesabınıza</strong> şu anda bir oturum açma işlemi başlatılmıştır.
        </p>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <div style="font-size: 12px; color: #94a3b8;">Giriş Yapılan Zaman:</div>
          <div style="font-size: 14px; font-weight: bold; color: #ffffff;">${new Date().toLocaleString('tr-TR')}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Bağlantı IP Adresi:</div>
          <div style="font-size: 14px; font-weight: bold; color: #38bdf8;">${ip || '127.0.0.1'}</div>
        </div>
        <p style="font-size: 13px; color: #fca5a5;">
          ⚠️ <strong>ÖNEMLİ:</strong> Eğer bu giriş işlemini siz yapmıyorsanız, sisteminizin güvenliği için derhal sunucu erişiminizi kontrol ediniz ve şifrenizi yenileyiniz.
        </p>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px;">
          BeeCursor ERP Ultra Güvenlik Protokolü • Otomatik Sistem Bildirimi
        </p>
      </div>
    `;

    try {
      if (!this.transporter) await this.initTransporter();
      const cfg = this.getSmtpConfig();
      const fromHeader = `"${cfg.from_name || 'BeeCursor Güvenlik'}" <${cfg.from_email || cfg.auth_user || 'noreply@beecursor.com'}>`;
      await this.transporter!.sendMail({
        from: fromHeader,
        to,
        subject,
        html: htmlBody,
        text: `ACİL UYARI: BeeCursor Master Root Hesabına Giriş Başlatıldı! Zaman: ${new Date().toLocaleString('tr-TR')} IP: ${ip}`,
      });
      console.log(`🚨 MASTER GİRİŞ UYARI E-POSTASI GÖNDERİLDİ -> ${to}`);
      db.prepare(`
        INSERT INTO email_logs (id, recipient, subject, body, action, code, status, preview_url)
        VALUES (?, ?, ?, ?, 'MASTER_LOGIN_ALERT', NULL, 'SENT', NULL)
      `).run(uuidv4(), to, subject, htmlBody);
    } catch (err) {
      console.error('Master uyarı maili gönderilemedi:', err);
    }
  }

  public async sendMasterOtpStep(to: string, step: number, totalSteps: number, code: string): Promise<void> {
    const titles = [
      '1. Aşama Kök Kimlik Doğrulama Kodu',
      '2. Aşama İkinci Kilit Güvenlik Kodu',
      '3. Aşama Son Master Kilit Açma Kodu',
    ];
    const currentTitle = titles[step - 1] || `${step}. Aşama Doğrulama Kodu`;
    const subject = `🔐 [${step}/${totalSteps} AŞAMA] Master Root Doğrulama Kodu: ${code}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #090d16; color: #f8fafc; padding: 32px; border-radius: 12px; border: 2px solid #6366f1;">
        <div style="text-align: center;">
          <h2 style="color: #818cf8; margin-top: 0; font-size: 18px;">🛡️ BeeCursor Master Root Çok Katmanlı Güvenlik</h2>
          <div style="display: inline-block; background: #312e81; color: #c7d2fe; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px;">
            Aşama ${step} / ${totalSteps} Doğrulaması
          </div>
        </div>
        <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          Master Root paneline erişebilmek için 3 aşamalı ardışık doğrulamanın <strong>${step}. aşamasındasınız</strong>.
        </p>
        <div style="background: #1e1b4b; border: 2px dashed #818cf8; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
          <div style="font-size: 11px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            ${currentTitle}
          </div>
          <div style="font-family: 'Courier New', monospace; font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #38bdf8;">
            ${code}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
            Bu kod tek kullanımlıktır ve 5 dakika geçerlidir.
          </div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
          ${step < totalSteps ? `Bu kodu girdikten sonra ${step + 1}. aşama kodu otomatik olarak e-postanıza gönderilecektir.` : 'Bu son kodu girdiğinizde sistem sahibi kontrol paneli tam yetkiyle açılacaktır.'}
        </p>
        <div style="font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 12px; text-align: center;">
          BeeCursor ERP Kök Yetki Güvenlik Katmanı
        </div>
      </div>
    `;

    try {
      if (!this.transporter) await this.initTransporter();
      const cfg = this.getSmtpConfig();
      const fromHeader = `"${cfg.from_name || 'BeeCursor Güvenlik'}" <${cfg.from_email || cfg.auth_user || 'noreply@beecursor.com'}>`;
      await this.transporter!.sendMail({
        from: fromHeader,
        to,
        subject,
        html: htmlBody,
        text: `[${step}/${totalSteps} AŞAMA] Master Root Doğrulama Kodu: ${code}`,
      });
      console.log(`🔑 MASTER OTP AŞAMA ${step}/${totalSteps} GÖNDERİLDİ -> ${to} [${code}]`);
      db.prepare(`
        INSERT INTO email_logs (id, recipient, subject, body, action, code, status, preview_url)
        VALUES (?, ?, ?, ?, ?, ?, 'SENT', NULL)
      `).run(uuidv4(), to, subject, htmlBody, `MASTER_OTP_STEP_${step}`, code);
    } catch (err) {
      console.error(`Master OTP Step ${step} mail hatası:`, err);
    }
  }

  public getRecentLogs(limit: number = 25): EmailLog[] {
    return db.prepare('SELECT * FROM email_logs ORDER BY created_at DESC LIMIT ?').all(limit) as EmailLog[];
  }
}

export const emailService = new EmailService();
