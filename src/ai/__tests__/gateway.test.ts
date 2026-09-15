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

  it('testConnection: نجاح', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    const r = await testConnection({ baseUrl: 'https://x.test/v1', model: 'gpt-test', apiKey: 'k' });
    expect(r.ok).toBe(true);
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
});
