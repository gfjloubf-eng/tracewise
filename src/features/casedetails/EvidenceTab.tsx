/** تبويب الأدلة — عرض + إضافة (10 أنواع) مع حجب تلقائي */
import React, { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { BottomModal, Btn, Card, EmptyState, Field } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { DebugCase, EvidenceType } from '../../domain/types';
import { useStore } from '../../state/AppStore';

const TYPES: Array<{ type: EvidenceType; icon: keyof typeof Ionicons.glyphMap }> = [
  { type: 'error', icon: 'alert-circle-outline' },
  { type: 'log', icon: 'list-outline' },
  { type: 'screenshot', icon: 'image-outline' },
  { type: 'code', icon: 'code-slash-outline' },
  { type: 'stacktrace', icon: 'layers-outline' },
  { type: 'commit', icon: 'git-commit-outline' },
  { type: 'issue', icon: 'bug-outline' },
  { type: 'pull_request', icon: 'git-pull-request-outline' },
  { type: 'environment', icon: 'hardware-chip-outline' },
  { type: 'recent_change', icon: 'swap-horizontal-outline' },
];

export function EvidenceTab({ c, dark }: { c: DebugCase; dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const { addEvidence, deleteEvidence } = useStore();

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<EvidenceType>('error');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle('');
    setContent('');
    setSource('');
    setType('error');
  };

  const submit = async () => {
    if (!title.trim() && !content.trim()) return;
    setBusy(true);
    await addEvidence(c.id, {
      type,
      title: title.trim() || tr(`evidence.type.${type}`),
      content,
      source: source.trim() || undefined,
    });
    setBusy(false);
    setAdding(false);
    reset();
  };

  return (
    <View style={{ gap: t.spacing(3) }}>
      <Btn dark={dark} icon="add-circle-outline" label={tr('evidence.add')} onPress={() => setAdding(true)} />

      {c.evidence.length === 0 ? (
        <EmptyState dark={dark} icon="documents-outline" title={tr('evidence.empty')} />
      ) : (
        c.evidence.map((e) => {
          const meta = TYPES.find((x) => x.type === e.type);
          return (
            <Card key={e.id} dark={dark}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={meta?.icon ?? 'document-outline'} size={16} color={t.colors.accent} />
                <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{tr(`evidence.type.${e.type}`)}</Text>
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={t.colors.danger}
                  onPress={() =>
                    Alert.alert(tr('evidence.deleteConfirm'), '', [
                      { text: tr('common.cancel'), style: 'cancel' },
                      { text: tr('common.delete'), style: 'destructive', onPress: () => void deleteEvidence(c.id, e.id) },
                    ])
                  }
                />
              </View>
              {e.imageDataUri && (
                <Image source={{ uri: e.imageDataUri }} style={{ width: '100%', height: 140, borderRadius: t.radius.md }} resizeMode="cover" />
              )}
              {!!e.content &&
                (() => {
                  // أدلة الأكواد/السجلات/المسارات: LTR ثابت — بقية النصوص تتبع اللغة
                  const codeLike = ['code', 'stacktrace', 'log', 'error', 'screenshot'].includes(e.type);
                  return (
                    <Text
                      selectable
                      style={{
                        color: t.colors.textMuted,
                        fontSize: t.font.small,
                        fontFamily: codeLike ? 'monospace' : undefined,
                        writingDirection: codeLike ? 'ltr' : 'auto',
                        textAlign: codeLike ? 'left' : undefined,
                        lineHeight: 20,
                      }}
                    >
                      {e.content}
                    </Text>
                  );
                })()}
              {e.source && <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{e.source}</Text>}
              {e.redactionCount > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="eye-off-outline" size={13} color={t.colors.warning} />
                  <Text style={{ color: t.colors.warning, fontSize: t.font.tiny }}>
                    {tr('evidence.redacted', { n: e.redactionCount })}
                  </Text>
                </View>
              )}
            </Card>
          );
        })
      )}

      <BottomModal visible={adding} onClose={() => setAdding(false)} dark={dark} title={tr('evidence.add')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TYPES.map((x) => {
            const active = type === x.type;
            return (
              <View key={x.type}>
                <Btn
                  dark={dark}
                  variant={active ? 'primary' : 'secondary'}
                  label={tr(`evidence.type.${x.type}`)}
                  icon={x.icon}
                  full={false}
                  onPress={() => setType(x.type)}
                />
              </View>
            );
          })}
        </View>
        <Field dark={dark} label={tr('evidence.titleLabel')} value={title} onChangeText={setTitle} />
        <Field dark={dark} label={tr('evidence.contentLabel')} value={content} onChangeText={setContent} multiline mono />
        <Field dark={dark} label={`${tr('evidence.sourceLabel')} (${tr('common.optional')})`} value={source} onChangeText={setSource} />
        <Btn dark={dark} label={tr('common.save')} icon="checkmark" onPress={submit} loading={busy} />
      </BottomModal>
    </View>
  );
}
