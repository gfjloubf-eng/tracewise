import { redactText, containsSecrets } from '../redaction';

describe('Secret Redaction', () => {
  it('يحجب ترويسة Authorization مع Bearer', () => {
    const r = redactText('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEF123_-x');
    expect(r.text).toContain('Authorization: Bearer [REDACTED]');
    expect(r.text).not.toContain('eyJhbGciOiJIUzI1NiIs');
    expect(r.hits.length).toBeGreaterThan(0);
  });

  it('يحجب JWT في أي مكان', () => {
    const r = redactText('token=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWxpIn0.c2lnbmF0dXJlLXhl');
    expect(r.text).toContain('[REDACTED_JWT]');
    expect(r.text).not.toContain('eyJ1c2VyIjoiYWxpIn0');
  });

  it('يحجب قيم .env والأسناد السرية', () => {
    const env = `
API_KEY=${'sk_live_' + '9f8a7b6c5d4e3f2a1b0c'}
DB_PASSWORD="Sup3rS3cret!"
client_secret: abc123def456
password=hunter2
`;
    const r = redactText(env);
    expect(r.text).not.toContain('sk_live_' + '9f8a7b6c5d4e3f2a1b0c');
    expect(r.text).not.toContain('Sup3rS3cret');
    expect(r.text).not.toContain('hunter2');
    expect(r.text).toContain('API_KEY=[REDACTED]');
  });

  it('يحجب مفاتيح AWS وGitHub وSlack', () => {
    const r = redactText(
      `aws=${'AKIA' + 'IOSFODNN7EXAMPLE'} gh=${'ghp_' + '1234567890abcdefghijklmnopqrstuvwx'} slack=${'xox' + 'b-123456789012-abcdefghijklmnop'}`
    );
    expect(r.text).not.toContain('AKIA' + 'IOSFODNN7EXAMPLE');
    expect(r.text).not.toContain('ghp_' + '1234567890');
    expect(r.text).not.toContain('xox' + 'b-123456789012');
  });

  it('يحجب كتل المفاتيح الخاصة', () => {
    const key = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234abcd\n-----END RSA PRIVATE KEY-----';
    const r = redactText(`config:\n${key}\nend`);
    expect(r.text).not.toContain('MIIEpAIBAAKCAQEA1234abcd');
    expect(r.hits.some((h) => h.kind === 'private_key')).toBe(true);
  });

  it('يحجب بيانات اعتماد قواعد البيانات في الروابط', () => {
    const r = redactText('postgres://admin:s3cr3tP@ss@db.example.com:5432/app');
    expect(r.text).not.toContain('s3cr3tP@ss');
    expect(r.text).not.toContain('admin');
    expect(r.text).toContain('postgres://[REDACTED_CREDENTIALS]@db.example.com:5432/app');
  });

  it('لا يحجب نصًا عاديًا', () => {
    const normal = 'HTTP 404 Not Found at /api/users — تأكد من المسار';
    const r = redactText(normal);
    expect(r.text).toBe(normal);
    expect(r.hits).toHaveLength(0);
  });

  it('الحجب Idempotent — نص محجوب لا يُعاد حجبه ولا يُكتشف كسر', () => {
    const originals = [
      'Authorization: Bearer abcdef1234567890',
      'api_key=SUPERSECRETVALUE123',
      'password=hunter2x',
      'postgres://admin:secret@db.example.com:5432/app',
    ];
    for (const o of originals) {
      const once = redactText(o);
      expect(containsSecrets(once.text)).toBe(false);
      const twice = redactText(once.text);
      expect(twice.text).toBe(once.text);
      expect(twice.hits).toHaveLength(0);
    }
  });

  it('containsSecrets تكشف الأسرار', () => {
    expect(containsSecrets('Authorization: Bearer abcdef1234567890')).toBe(true);
    expect(containsSecrets('عادي جدًا')).toBe(false);
  });

  it('الملخص لا يحتوي على محتوى السر', () => {
    const r = redactText('api_key=abc123secretvalue');
    for (const h of r.hits) {
      expect(h.masked).not.toContain('abc123secretvalue');
    }
  });
});
