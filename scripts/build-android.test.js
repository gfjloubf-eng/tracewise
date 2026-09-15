const { parseJavaMajorVersion } = require('./build-android');

test('parses modern Java versions', () => {
  expect(parseJavaMajorVersion('openjdk version "17.0.12" 2024-07-16')).toBe(17);
  expect(parseJavaMajorVersion('openjdk version "21.0.11" 2026-04-21')).toBe(21);
});

test('parses legacy Java 8 format', () => {
  expect(parseJavaMajorVersion('java version "1.8.0_401"')).toBe(8);
});

test('returns null for an unrecognized version', () => {
  expect(parseJavaMajorVersion('java version unknown')).toBeNull();
});
