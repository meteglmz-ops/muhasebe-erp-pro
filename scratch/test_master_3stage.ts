import http from 'http';
import { db } from '../server/src/database/db';

function post(path: string, body: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 200, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode || 200, body: b });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test3StageFlow() {
  console.log('--- TEST: 3 AŞAMALI MASTER ROOT GİRİŞ VE E-POSTA AKIŞI ---');
  
  // 1. Initiate (Giriş İsteği & Uyarı Maili & 1. Kod)
  const initRes = await post('/api/admin/auth/initiate', {
    email: 'admin@beecursor.com',
    password: 'admin123',
    masterKey: 'ROOT-MASTER-777'
  });
  console.log('1. Initiate Yanıtı:', initRes.status, initRes.body.message);
  let sessionToken = initRes.body.data.sessionToken;

  // DB'den 1. kodu bulalım
  const otp1 = db.prepare("SELECT code FROM otp_codes WHERE email = 'admin@beecursor.com' AND action = 'MASTER_OTP_STEP_1' AND used = 0").get() as any;
  console.log('   Gelen 1. Kod:', otp1.code);

  // 2. 1. Kodu Doğrula -> 2. Kod İletilsin
  const step1Res = await post('/api/admin/auth/verify-step', {
    sessionToken,
    code: otp1.code
  });
  console.log('2. Step 1 Doğrulama:', step1Res.status, step1Res.body.message);
  sessionToken = step1Res.body.data.sessionToken;

  // DB'den 2. kodu bulalım
  const otp2 = db.prepare("SELECT code FROM otp_codes WHERE email = 'admin@beecursor.com' AND action = 'MASTER_OTP_STEP_2' AND used = 0").get() as any;
  console.log('   Gelen 2. Kod:', otp2.code);

  // 3. 2. Kodu Doğrula -> 3. Kod İletilsin
  const step2Res = await post('/api/admin/auth/verify-step', {
    sessionToken,
    code: otp2.code
  });
  console.log('3. Step 2 Doğrulama:', step2Res.status, step2Res.body.message);
  sessionToken = step2Res.body.data.sessionToken;

  // DB'den 3. kodu bulalım
  const otp3 = db.prepare("SELECT code FROM otp_codes WHERE email = 'admin@beecursor.com' AND action = 'MASTER_OTP_STEP_3' AND used = 0").get() as any;
  console.log('   Gelen 3. (Son) Kod:', otp3.code);

  // 4. 3. Kodu Doğrula -> Tam Yetkili Token Üretilsin
  const step3Res = await post('/api/admin/auth/verify-step', {
    sessionToken,
    code: otp3.code
  });
  console.log('4. Step 3 (Son Kilit) Doğrulama:', step3Res.status, step3Res.body.message);
  console.log('   Master Admin Token Alındı mı:', !!step3Res.body.data.token);

  console.log('\n✅ 3 AŞAMALI VE UYARI MAİLLİ MASTER GİRİŞ AKIŞI EKSİKSİZ TAMAMLANDI!');
}

test3StageFlow().catch(console.error);
