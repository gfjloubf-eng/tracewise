/**
 * محول OCR — Adapter نظيف لمزود OCR حقيقي.
 *
 * • على الويب: TesseractWebOcr يحمّل tesseract.js فعليًا من CDN ويعمل (يتطلب إنترنت).
 * • على Android/iOS: لا يوجد محرك مضمّن — يُعاد null وتعرض الواجهة مسار "الصق النص".
 *   (الربط المستقبلي: ML Kit عبر config plugin — نفس الواجهة OcrEngine).
 *
 * لا يوجد OCR وهمي: إما محرك حقيقي يعمل أو لا شيء.
 */
import { Platform } from 'react-native';
import { OcrEngine } from '../security/scanner';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const window: any;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('NO_DOM'));
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('SCRIPT_LOAD_FAILED'));
    document.head.appendChild(el);
  });
}

/** Tesseract.js (web) — تحميل كسول من CDN عند أول استخدام فقط */
export class TesseractWebOcr implements OcrEngine {
  readonly name = 'tesseract.js';

  async recognize(imageDataUri: string): Promise<string> {
    const CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    await loadScript(CDN);
    const Tesseract = window.Tesseract;
    if (!Tesseract) throw new Error('OCR_ENGINE_MISSING');
    // eng يكفي لرسائل الأخطاء البرمجية (الأكواد إنجليزية)
    const result = await Tesseract.recognize(imageDataUri, 'eng', {
      logger: () => undefined,
    });
    return String(result?.data?.text ?? '');
  }
}

/** المحرك المتاح على المنصة الحالية — null يعني لا OCR حقيقي متاح */
export function getAvailableOcrEngine(): OcrEngine | null {
  if (Platform.OS === 'web') return new TesseractWebOcr();
  return null;
}
