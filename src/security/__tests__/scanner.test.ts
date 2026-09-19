import {
  extractErrorMessage,
  extractFileName,
  extractLineNumber,
  extractPackageName,
  extractStackFrames,
  scanText,
} from '../scanner';

const SAMPLE = `
Unhandled Exception: TypeError: Cannot read property 'id' of undefined
    at UserCard.render (src/components/UserCard.tsx:88:12)
    at finishClassComponent (node_modules/react-native/Libraries/Renderer.js:120:4)
Error occurred in module 'react-native-gesture-handler'
See src/components/UserCard.tsx line 88 for details.
`;

describe('Scanner — استخراج الإشارات', () => {
  it('يستخرج رسالة الخطأ', () => {
    expect(extractErrorMessage(SAMPLE)).toContain('TypeError');
  });

  it('يستخرج اسم الملف', () => {
    expect(extractFileName(SAMPLE)).toContain('UserCard.tsx');
  });

  it('يستخرج رقم السطر', () => {
    expect(extractLineNumber(SAMPLE)).toBe(88);
  });

  it('يستخرج إطارات Stack Trace', () => {
    const frames = extractStackFrames(SAMPLE);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(frames[0]).toContain('UserCard.render');
  });

  it('يستخرج اسم الحزمة', () => {
    expect(extractPackageName(SAMPLE)).toBe('react-native-gesture-handler');
  });

  it('scanText يجمع كل الإشارات', () => {
    const r = scanText(SAMPLE);
    expect(r.errorMessage).toBeTruthy();
    expect(r.fileName).toBeTruthy();
    expect(r.lineNumber).toBe(88);
    expect(r.stackFrames.length).toBeGreaterThan(0);
    expect(r.packageName).toBeTruthy();
    expect(r.rawText).toBe(SAMPLE);
  });

  it('نص بلا إشارات → نتائج فارغة دون أخطاء', () => {
    const r = scanText('نص عادي جدًا بلا أي شيء مهم');
    expect(r.errorMessage).toBeUndefined();
    expect(r.fileName).toBeUndefined();
    expect(r.stackFrames).toEqual([]);
  });

  it('نمط Python: File "...", line N', () => {
    const py = 'Traceback (most recent call last):\n  File "/srv/app/main.py", line 42, in handler\nValueError: bad input';
    const r = scanText(py);
    expect(r.fileName).toContain('main.py');
    expect(r.lineNumber).toBe(42);
    expect(r.stackFrames.length).toBe(1);
  });
});
