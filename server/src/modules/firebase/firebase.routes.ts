import { Router } from 'express';
import { firebaseService } from '../../services/firebase';
import { authMiddleware, auditLog } from '../../middleware/auth';

export const firebaseRouter = Router();

firebaseRouter.use(authMiddleware);

// 1. Firebase ve Bulut Altyapı Durumu
firebaseRouter.get('/status', (req, res) => {
  const status = firebaseService.getStatus();
  res.json({ success: true, data: status });
});

// 2. Firebase Yapılandırmasını Güncelleme
firebaseRouter.post('/config', (req, res) => {
  const { projectId, clientEmail, privateKey, apiKey, authDomain, storageBucket } = req.body;
  const updated = firebaseService.updateConfig({
    projectId,
    clientEmail,
    privateKey,
    apiKey,
    authDomain,
    storageBucket,
  });

  auditLog(req.user!.companyId, req.user!.userId, 'UPDATE', 'FIREBASE_CONFIG', 'firebase-config', { projectId });
  res.json({ success: true, data: updated, message: 'Firebase yapılandırması başarıyla kaydedildi.' });
});

// 3. Verileri Firebase / Bulut Depolamaya Senkronize Et
firebaseRouter.post('/sync', async (req, res) => {
  try {
    const result = await firebaseService.syncToCloud(req.user!.companyId);
    auditLog(req.user!.companyId, req.user!.userId, 'SYNC', 'FIREBASE_CLOUD', 'sync', result.syncedCounts);
    res.json({ success: true, data: result, message: 'Tüm muhasebe ve şirket verileri buluta başarıyla yedeklendi.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Senkronizasyon sırasında hata oluştu.' });
  }
});

// 4. Bulut Yedeğinden Geri Yükle / Kontrol Et
firebaseRouter.post('/restore', async (req, res) => {
  try {
    const result = await firebaseService.restoreFromCloud();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Geri yükleme sırasında hata oluştu.' });
  }
});
