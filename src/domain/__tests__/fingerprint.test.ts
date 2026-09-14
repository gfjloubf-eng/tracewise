import { buildFingerprint, detectSignal, extractTopFrame, similarity, normalizePath } from '../fingerprint';

describe('Problem Fingerprint', () => {
  it('نفس المشكلة بأرقام مختلفة → نفس البصمة', () => {
    const a = buildFingerprint({ errorMessage: 'RenderFlex overflowed by 42 pixels', stackTrace: '#0 build (package:app/x.dart:31:2)' });
    const b = buildFingerprint({ errorMessage: 'RenderFlex overflowed by 97 pixels', stackTrace: '#0 build (package:app/x.dart:88:4)' });
    expect(a.hash).toBe(b.hash);
    expect(a.errorKind).toBe('layout_overflow');
  });

  it('مشاكل مختلفة → بصمات مختلفة', () => {
    const a = buildFingerprint({ errorMessage: 'HTTP 401 Unauthorized' });
    const b = buildFingerprint({ errorMessage: 'HTTP 404 Not Found' });
    expect(a.hash).not.toBe(b.hash);
  });

  it('detectSignal: رموز HTTP', () => {
    expect(detectSignal('request failed with status 401').errorKind).toBe('http:401');
    expect(detectSignal('HTTP 500 Internal Server Error').errorKind).toBe('http:500');
  });

  it('detectSignal: أنواع شائعة', () => {
    expect(detectSignal('Unexpected token < in JSON').errorKind).toBe('json_parse');
    expect(detectSignal('npm ERR! ERESOLVE peer dep conflict').errorKind).toBe('dependency_conflict');
    expect(detectSignal('connect ETIMEDOUT 10.0.0.1:443').errorKind).toBe('network_timeout');
    expect(detectSignal('Cannot read properties of undefined').errorKind).toBe('null_reference');
    expect(detectSignal('NullPointerException at com.app.Main.run').errorKind).toBe('null_reference');
    expect(detectSignal('listen EADDRINUSE 0.0.0.0:3000').errorKind).toBe('port_in_use');
    expect(detectSignal('IndexOutOfBoundsException at com.app.Main.run').errorKind).toBe('exception:IndexOutOfBoundsException');
  });

  it('extractTopFrame: JS/Dart/Python', () => {
    expect(extractTopFrame('Error: x\n    at AuthApi.login (/app/src/api/auth.ts:42:18)')).toBe('auth.ts::AuthApi.login');
    expect(extractTopFrame('#0      ProfileAvatar.build (package:app/widgets/profile_avatar.dart:31:42)')).toBe(
      'profile_avatar.dart::ProfileAvatar.build'
    );
    expect(extractTopFrame('Traceback:\n  File "/srv/app/main.py", line 12, in handler')).toBe('main.py::handler');
  });

  it('normalizePath يزيل المسار وأرقام الأسطر', () => {
    expect(normalizePath('/home/user/src/app/api/auth.ts:42:18')).toBe('auth.ts');
  });

  it('similarity: نفس البصمة = 1، مختلفان = أقل', () => {
    const a = buildFingerprint({ errorMessage: 'HTTP 401 unauthorized on login', title: 'login fails with 401' });
    const b = buildFingerprint({ errorMessage: 'HTTP 401 unauthorized on login', title: 'login fails with 401' });
    const c = buildFingerprint({ errorMessage: 'database connection refused', title: 'db down' });
    expect(similarity(a, b)).toBe(1);
    expect(similarity(a, c)).toBeLessThan(0.5);
  });

  it('similarity: نفس errorKind يمنح مكافأة', () => {
    const a = buildFingerprint({ errorMessage: 'HTTP 401 on /api/auth/login token expired' });
    const b = buildFingerprint({ errorMessage: 'HTTP 401 on /api/user/profile session invalid' });
    expect(similarity(a, b)).toBeGreaterThan(similarity(a, buildFingerprint({ errorMessage: 'layout overflow by 10 pixels' })));
  });
});
