/**
 * Expo config plugin — ضبط Gradle لبيئات CI (4 أنوية / 16GB).
 *
 * السبب: إضافة expo-updates أطالت زمن assembleRelease حتى تجاوزت حد الـ20 دقيقة
 * في GitHub Actions (exit 124). التوازي + الذاكرة الأكبر يعيدان البناء داخل الحد
 * دون أي تغيير في إصدارات Expo/RN/Gradle أو سلوك التطبيق.
 */
const { withGradleProperties } = require('expo/config-plugins');

const TUNING = {
  'org.gradle.jvmargs': '-Xmx4608m -XX:MaxMetaspaceSize=1024m',
  'org.gradle.parallel': 'true',
  'org.gradle.caching': 'true',
  'org.gradle.workers.max': '4',
};

module.exports = function withGradleTuning(config) {
  return withGradleProperties(config, (cfg) => {
    // modResults مصفوفة عناصر {type:'property'|'comment'|'empty', ...}
    const props = Array.isArray(cfg.modResults) ? cfg.modResults : cfg.modResults.properties;
    for (const [key, value] of Object.entries(TUNING)) {
      const i = props.findIndex((p) => p.type === 'property' && p.key === key);
      if (i >= 0) props[i] = { type: 'property', key, value };
      else props.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
