/**
 * Scanner — لقطة شاشة → OCR (إن توفر محرك حقيقي) → استخراج إشارات →
 * مراجعة/تعديل يدوي → إضافة كدليل أو إنشاء Debug Case جديدة.
 */
import React, { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getTheme } from '../../core/theme';
import { Btn, Card, Field } from '../../ui/components';
import { SectionHeader, TracewiseBackdrop, TracewiseEmptyState } from '../../ui/tracewise';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { scanText } from '../../security/scanner';
import { getAvailableOcrEngine } from '../../integrations/ocr';

export function ScannerScreen({
  dark,
  initialCaseId,
  onAdded,
}: {
  dark: boolean;
  initialCaseId?: string;
  onAdded: (caseId: string) => void;
}) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { cases, addEvidence, createCase } = useStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [lineNumber, setLineNumber] = useState('');
  const [stack, setStack] = useState('');
  const [pkg, setPkg] = useState('');
  const [caseId, setCaseId] = useState<string>(initialCaseId ?? cases[0]?.id ?? '');
  const [extracted, setExtracted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);

  const ocrEngine = getAvailableOcrEngine();

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(tr('common.error'), tr('scanner.ocrUnavailable'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setImageUri(res.assets[0].uri);
    }
  };

  /** OCR حقيقي عبر المحرك المتاح (يتطلب إنترنت على الويب) */
  const runOcr = async () => {
    if (!imageUri || !ocrEngine) return;
    setOcrBusy(true);
    try {
      const text = await ocrEngine.recognize(imageUri);
      if (text.trim()) {
        setRawText(text);
        applyExtraction(text);
      } else {
        Alert.alert(tr('scanner.title'), tr('scanner.ocrUnavailable'));
      }
    } catch {
      Alert.alert(tr('scanner.title'), tr('scanner.ocrUnavailable'));
    } finally {
      setOcrBusy(false);
    }
  };

  const applyExtraction = (text: string) => {
    const r = scanText(text);
    setErrorMessage(r.errorMessage ?? '');
    setFileName(r.fileName ?? '');
    setLineNumber(r.lineNumber ? String(r.lineNumber) : '');
    setStack(r.stackFrames.join('\n'));
    setPkg(r.packageName ?? '');
    setExtracted(true);
  };

  const extract = () => applyExtraction(rawText);

  const buildContent = () =>
    [
      errorMessage && `Error: ${errorMessage}`,
      fileName && `File: ${fileName}${lineNumber ? `:${lineNumber}` : ''}`,
      pkg && `Package: ${pkg}`,
      stack && `Stack:\n${stack}`,
    ]
      .filter(Boolean)
      .join('\n') || rawText;

  const addAsEvidence = async () => {
    if (!caseId) return;
    setBusy(true);
    await addEvidence(caseId, {
      type: 'screenshot',
      title: tr('scanner.title'),
      content: buildContent(),
      imageDataUri: imageUri ?? undefined,
    });
    setBusy(false);
    onAdded(caseId);
  };

  /** إنشاء Debug Case مباشرة من نتائج الفحص */
  const createCaseFromScan = async () => {
    setBusy(true);
    try {
      const c = await createCase({
        title: errorMessage ? errorMessage.slice(0, 80) : tr('scanner.title'),
        description: `أُنشئت من ${tr('scanner.title')}${fileName ? ` — ${fileName}${lineNumber ? `:${lineNumber}` : ''}` : ''}`,
        errorMessage: errorMessage || undefined,
        stackTrace: stack || undefined,
      });
      await addEvidence(c.id, {
        type: 'screenshot',
        title: tr('scanner.title'),
        content: buildContent(),
        imageDataUri: imageUri ?? undefined,
      });
      onAdded(c.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TracewiseBackdrop dark={dark}>
    <View style={{ flex: 1, gap: t.spacing(3), padding: t.spacing(4) }}>
      <Text style={{ color: t.colors.text, fontSize: t.font.large, fontWeight: '800', marginTop: t.spacing(2) }}>
        {tr('scanner.title')}
      </Text>

      <Card dark={dark} style={{ alignItems: 'center', gap: t.spacing(3) }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: 180, borderRadius: t.radius.md }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.small }}>{tr('scanner.pick')}</Text>
        )}
        <Btn dark={dark} variant="secondary" icon="image-outline" label={tr('scanner.pick')} onPress={pickImage} />
        {imageUri && ocrEngine && (
          <Btn
            dark={dark}
            icon="scan-outline"
            label="OCR — استخراج النص من الصورة"
            onPress={runOcr}
            loading={ocrBusy}
          />
        )}
        {imageUri && !ocrEngine && (
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, textAlign: 'center' }}>
            {tr('scanner.ocrUnavailable')}
          </Text>
        )}
      </Card>

      <Field dark={dark} label={tr('scanner.paste')} value={rawText} onChangeText={setRawText} multiline mono />
      <Btn dark={dark} icon="sparkles-outline" label={tr('scanner.extract')} onPress={extract} disabled={!rawText.trim()} />

      {extracted && (
        <>
          <SectionHeader dark={dark} title={tr('scanner.editable')} icon="create-outline" />
          <Field dark={dark} label={tr('scanner.errorMessage')} value={errorMessage} onChangeText={setErrorMessage} />
          <View style={{ flexDirection: 'row', gap: t.spacing(3) }}>
            <View style={{ flex: 2 }}>
              <Field dark={dark} label={tr('scanner.fileName')} value={fileName} onChangeText={setFileName} mono />
            </View>
            <View style={{ flex: 1 }}>
              <Field dark={dark} label={tr('scanner.lineNumber')} value={lineNumber} onChangeText={setLineNumber} mono />
            </View>
          </View>
          <Field dark={dark} label={tr('scanner.package')} value={pkg} onChangeText={setPkg} mono />
          <Field dark={dark} label={tr('scanner.stack')} value={stack} onChangeText={setStack} multiline mono />

          {/* إنشاء حالة جديدة مباشرة من الفحص */}
          <Btn
            dark={dark}
            icon="bug-outline"
            label="إنشاء مشكلة جديدة من الفحص"
            onPress={createCaseFromScan}
            loading={busy}
            disabled={!errorMessage && !rawText.trim()}
          />

          <SectionHeader dark={dark} title={tr('scanner.pickCase')} />
          {cases.map((c) => (
            <Card
              key={c.id}
              dark={dark}
              onPress={() => setCaseId(c.id)}
              style={{ borderColor: caseId === c.id ? t.colors.primary : t.colors.cardBorder }}
            >
              <Text numberOfLines={1} style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
                {caseId === c.id ? '✓ ' : ''}
                {c.title}
              </Text>
            </Card>
          ))}

          <Btn
            dark={dark}
            icon="add-circle-outline"
            label={tr('scanner.addAsEvidence')}
            onPress={addAsEvidence}
            loading={busy}
            disabled={!caseId || (!errorMessage && !rawText.trim())}
          />
        </>
      )}
    </View>
    </TracewiseBackdrop>
  );
}
