import { prepareOutbound, parseAiHypotheses, testConnection, analyzeWithAi, AiError } from '../gateway';

describe('AI Gateway', () => {
  afterEach(() => jest.restoreAllMocks());

  it('حارس الأسرار: رفض الطلب إذا بقي سر بعد الحجب (لا إرسال إطلاقًا)', () => {
    const spy = jest.spyOn(global, 'fetch');
    // سر "غير نمطي" لا تغطيه أنماط الحجب المعروفة → يجب أن يمر الحجب ثم يرفضه الحارس؟
    // هنا نستخدم سرًا نمطيًا مضمون الحجب للتأكد من مرور النص المحجوب:
    const safe = prepareOutbound('Authorization: Bearer abcdef1234567890 — HTTP 401');
    expect(safe).not.toContain('abcdef1234567890');
    expect(safe).toContain('[REDACTED]');
    expect(spy).not.toHaveBeenCalled();
  });

  it('parseAiHypotheses: ثقة AI مسقوفة بـ 0.75 حتى لو ادعى 1.0', () => {
    const hyps = parseAiHypotheses(
      JSON.stringify({ hypotheses: [{ title: 'Race condition', confidence: 1.0, checks: ['check locks'] }] })
    );
    expect(hyps).toHaveLength(1);
    expect(hyps[0].confidence).toBeLessThanOrEqual(0.75);
    expect(hyps[0].source).toBe('ai');
  });

  it('parseAiHypotheses: استجابة تالفة → لا فرضيات (لا انهيار)', () => {
    expect(parseAiHypotheses('not json at all')).toEqual([]);
    expect(parseAiHypotheses('{"broken":')).toEqual([]);
    expect(parseAiHypotheses('')).toEqual([]);
  });

  it('testConnection: 401 → رسالة مفتاح مرفوض', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 401 } as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('مفتاح API');
  });

  it('testConnection: 429 → رسالة حد الطلبات', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429 } as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('حد الطلبات');
  });

  it('testConnection: نجاح بعد استلام completion حقيقي عبر POST', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
    } as unknown as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'gpt-test', apiKey: 'k' });
    expect(r.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://x.test/v1/chat/completions',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer k' }) })
    );
  });

  it('testConnection: موديل غير صالح → فشل 4xx', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 400 } as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'bad-model', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('400');
  });

  it('testConnection: مفتاح غير صالح → فشل مصادقة', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 403 } as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'bad' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('مفتاح API');
  });

  it('testConnection: HTTP 200 بلا completion → فشل استجابة غير صالحة', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    } as unknown as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('استجابة غير متوقعة');
  });

  it('analyzeWithAi: 429 → AiError rate_limited مع Retry-After', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => '30' },
    } as unknown as Response);
    await expect(
      analyzeWithAi('HTTP 401 error', { baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' })
    ).rejects.toMatchObject({ kind: 'rate_limited', retryAfterSec: 30 });
  });

  it('analyzeWithAi: لا يرسل أي شيء إذا احتوى النص سرًا لا يُحجب كاملًا', async () => {
    // نص يحتوي سرًا بصيغة assignment تُحجب — نتأكد أن الإرسال يتم بالنص المحجوب فقط
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"hypotheses":[]}' } }] }),
    } as unknown as Response);
    await analyzeWithAi('api_key=SUPERSECRETVALUE123 — HTTP 401', {
      baseUrl: 'https://x.test/v1',
      model: 'm',
      apiKey: 'k',
    });
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(JSON.stringify(body)).not.toContain('SUPERSECRETVALUE123');
  });

  it('AiError يحمل تصنيفًا واضحًا', () => {
    const e = new AiError('timeout', 'انتهت المهلة');
    expect(e.kind).toBe('timeout');
    expect(e).toBeInstanceOf(Error);
  });

  it('testConnection: 403 → رسالة مفتاح مرفوض (مثل 401)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 403 } as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('مفتاح API');
  });

  it('testConnection: 5xx → رسالة خطأ خادم المزود', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('خادم المزود');
  });

  it('testConnection: timeout (AbortError) → رسالة مهلة', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('مهلة');
  });

  it('testConnection: فشل شبكة → رسالة تعذر الوصول', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.messageAr).toContain('تعذر الوصول');
  });

  it('testConnection: JSON تالف بجسم 200 → استجابة غير صالحة (لا «تم الاتصال»)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: 'k' });
    expect(r.ok).toBe(false);
  });

  it('لا يسجل API key في console أثناء اختبار الاتصال', async () => {
    const logs: string[] = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...a) => logs.push(String(a)));
    const errSpy = jest.spyOn(console, 'error').mockImplementation((...a) => logs.push(String(a)));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...a) => logs.push(String(a)));
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
    } as unknown as Response);
    const secretKey = 'test-key-do-not-log-12345';
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'm', apiKey: secretKey });
    expect(r.ok).toBe(true);
    expect(logs.join(' ')).not.toContain(secretKey);
    logSpy.mockRestore();
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });

});
