/**
 * Scanner — اختيار لقطة شاشة + محاولة استخراج الإشارات.
 * OCR اختياري (إن توفر محرك) — والصق النص اليدوي مدعوم دائمًا.
 * كل الناتج قابل للتعديل قبل إضافته كدليل.
 */
import React, { useState } from 'react';
import { Alert, Image, Platform, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getTheme } from '../../core/theme';
import { Btn, Card, Field, SectionTitle } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { scanText } from '../../security/scanner';

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
  const { cases, addEvidence } = useStore();

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
      // محاولة OCR عبر محرك قابل للاستبدال — غير متوفر افتراضيًا
      // (البنية جاهزة لربط tesseract.js على الويب أو محرك أصلي على الجهاز)
      Alert.alert(tr('scanner.title'), tr('scanner.ocrUnavailable'));
    }
  };

  const extract = () => {
    const r = scanText(rawText);
    setErrorMessage(r.errorMessage ?? '');
    setFileName(r.fileName ?? '');
    setLineNumber(r.lineNumber ? String(r.lineNumber) : '');
    setStack(r.stackFrames.join('\n'));
    setPkg(r.packageName ?? '');
    setExtracted(true);
  };

  const addAsEvidence = async () => {
    if (!caseId) return;
    setBusy(true);
    const parts = [
      errorMessage && `Error: ${errorMessage}`,
      fileName && `File: ${fileName}${lineNumber ? `:${lineNumber}` : ''}`,
      pkg && `Package: ${pkg}`,
      stack && `Stack:\n${stack}`,
    ].filter(Boolean);
    await addEvidence(caseId, {
      type: 'screenshot',
      title: tr('scanner.title'),
      content: parts.join('\n') || rawText,
      imageDataUri: imageUri ?? undefined,
    });
    setBusy(false);
    onAdded(caseId);
  };

  const targetCase = cases.find((c) => c.id === caseId);

  return (
    <View style={{ gap: t.spacing(3), padding: t.spacing(4) }}>
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
      </Card>

      <Field
        dark={dark}
        label={tr('scanner.paste')}
        value={rawText}
        onChangeText={setRawText}
        multiline
        mono
      />
      <Btn dark={dark} icon="sparkles-outline" label={tr('scanner.extract')} onPress={extract} disabled={!rawText.trim()} />

      {extracted && (
        <>
          <SectionTitle dark={dark} text={tr('scanner.editable')} icon="create-outline" />
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

          <SectionTitle dark={dark} text={tr('scanner.pickCase')} />
          {cases.map((c) => (
            <Card
              key={c.id}
              dark={dark}
              onPress={() => setCaseId(c.id)}
              style={{ borderColor: caseId === c.id ? t.colors.primary : t.colors.cardBorder }}
            >
              <Text numberOfLines={1} style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
                {caseId === c.id ? '✓ ' : ''}{c.title}
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
          {Platform.OS !== 'web' && targetCase && (
            <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny, textAlign: 'center' }}>
              {targetCase.title}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
