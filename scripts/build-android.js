#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const process = require('node:process');
const path = require('node:path');

function parseJavaMajorVersion(versionOutput) {
  const match = String(versionOutput).match(/version\s+"(\d+)(?:\.(\d+))?/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] == null ? null : Number(match[2]);
  // Java 8 is reported as 1.8; modern Java is reported as 17, 21, ...
  return first === 1 && second != null ? second : first;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) {
    console.error(`TRACEWISE build error: unable to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  const release = process.argv.includes('--release');
  const javaPath = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
    : 'java';
  const java = spawnSync(javaPath, ['-version'], { encoding: 'utf8', shell: false });
  const javaOutput = `${java.stderr ?? ''}\n${java.stdout ?? ''}`;
  const javaMajor = parseJavaMajorVersion(javaOutput);

  if (java.status !== 0 || javaMajor == null) {
    console.error('TRACEWISE APK build requires Java 17 or newer. Java was not detected.');
    console.error('Set JAVA_HOME to a JDK 17+ installation and run the command again.');
    process.exit(1);
  }
  if (javaMajor < 17) {
    console.error(`TRACEWISE APK build requires Java 17 or newer; detected Java ${javaMajor}.`);
    console.error('Set JAVA_HOME to a JDK 17+ installation and run the command again.');
    process.exit(1);
  }

  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
    'expo', 'prebuild', '--platform', 'android', '--no-install', '--clean',
  ]);

  const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  run(gradleCommand, [release ? 'assembleRelease' : 'assembleDebug', '--no-daemon']);

  const variant = release ? 'release' : 'debug';
  console.log(`TRACEWISE APK build completed: android/app/build/outputs/apk/${variant}/app-${variant}.apk`);
}

module.exports = { parseJavaMajorVersion };

if (require.main === module) main();
