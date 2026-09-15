/**
 * متصفح مستودعات GitHub — قراءة فقط.
 * Commit → Diff، Issue → اقتراح تعليق (موافقة صريحة قبل التنفيذ)،
 * أي عنصر → "إضافة كدليل" لحالة مختارة (يمر عبر الحجب تلقائيًا).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../core/theme';
import { BottomModal, Btn, Card, EmptyState, Field, MonoText } from '../../ui/components';
import { useI18n } from '../../core/i18n/I18nProvider';
import { useStore } from '../../state/AppStore';
import { githubClient, GitHubProposal } from '../../integrations/github';

type Tab = 'files' | 'commits' | 'issues' | 'pulls' | 'branches';

interface RepoItem {
  id: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

export function RepoBrowserScreen({ dark }: { dark: boolean }) {
  const t = getTheme(dark);
  const { t: tr, lang } = useI18n();
  const { cases, addEvidence } = useStore();

  const [repos, setRepos] = useState<Array<{ full_name: string }>>([]);
  const [repo, setRepo] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('commits');
  const [items, setItems] = useState<RepoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [diffModal, setDiffModal] = useState<{ title: string; text: string } | null>(null);
  const [evidenceModal, setEvidenceModal] = useState<{ title: string; content: string } | null>(null);
  const [selectedCase, setSelectedCase] = useState<string>(cases[0]?.id ?? '');
  const [proposal, setProposal] = useState<GitHubProposal | null>(null);
  const [commentText, setCommentText] = useState('');
  const [proposalStatus, setProposalStatus] = useState('');

  const [owner, name] = useMemo(() => (repo ? repo.split('/') : ['', '']), [repo]);

  const loadRepos = async () => {
    setLoading(true);
    setError('');
    try {
      setRepos(await githubClient.listRepos());
    } catch {
      setError(tr('integrations.failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (githubClient.connected) void loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTab = async (nextTab: Tab) => {
    setTab(nextTab);
    if (!repo) return;
    setLoading(true);
    setError('');
    try {
      if (nextTab === 'commits') {
        const commits = await githubClient.listCommits(owner, name);
        setItems(
          commits.map((c) => ({
            id: c.sha,
            title: c.commit.message.split('\n')[0].slice(0, 80),
            subtitle: c.sha.slice(0, 7),
            onPress: async () => {
              const diff = await githubClient.getDiff(owner, name, c.sha);
              setDiffModal({ title: `${c.sha.slice(0, 7)} — Diff`, text: diff.slice(0, 4000) });
            },
          }))
        );
      } else if (nextTab === 'issues') {
        const issues = await githubClient.listIssues(owner, name);
        setItems(
          issues.map((i) => ({
            id: String(i.number),
            title: `#${i.number} — ${i.title}`,
            subtitle: i.state,
            onPress: () => {
              setProposal(
                githubClient.proposeIssueComment(repo!, i.number, `تحليل TRACEWISE للحالة ذات الصلة.`)
              );
              setCommentText('');
              setProposalStatus('');
            },
          }))
        );
      } else if (nextTab === 'pulls') {
        const prs = await githubClient.listPullRequests(owner, name);
        setItems(prs.map((p) => ({ id: String(p.number), title: `PR #${p.number} — ${p.title}`, subtitle: p.state })));
      } else if (nextTab === 'branches') {
        const brs = await githubClient.listBranches(owner, name);
        setItems(brs.map((b) => ({ id: b.name, title: b.name })));
      } else {
        const files = await githubClient.listFiles(owner, name);
        setItems(
          files.map((f) => ({
            id: f.path,
            title: f.name,
            subtitle: f.type,
            onPress:
              f.type === 'file'
                ? async () => {
                    const text = await githubClient.getFileText(owner, name, f.path);
                    setDiffModal({ title: f.path, text: text.slice(0, 4000) });
                  }
                : undefined,
          }))
        );
      }
    } catch {
      setError(tr('common.error'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repo) void loadTab('commits');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  const addAsEvidence = async () => {
    if (!evidenceModal || !selectedCase) return;
    await addEvidence(selectedCase, {
      type: evidenceModal.title.toLowerCase().includes('diff') ? 'commit' : 'code',
      title: evidenceModal.title,
      content: evidenceModal.content,
      source: repo ? `github:${repo}` : 'github',
    });
    setEvidenceModal(null);
  };

  // ——— الحالة: غير متصل ———
  if (!githubClient.connected) {
    return (
      <View style={{ padding: t.spacing(4) }}>
        <EmptyState dark={dark} icon="logo-github" title={tr('integrations.connect')} body={tr('integrations.githubDesc')} />
      </View>
    );
  }

  const TABS: Array<{ key: Tab; ar: string; en: string }> = [
    { key: 'files', ar: 'الملفات', en: 'Files' },
    { key: 'commits', ar: 'Commits', en: 'Commits' },
    { key: 'issues', ar: 'Issues', en: 'Issues' },
    { key: 'pulls', ar: 'Pull Requests', en: 'Pull Requests' },
    { key: 'branches', ar: 'الفروع', en: 'Branches' },
  ];

  return (
    <View style={{ flex: 1, gap: t.spacing(3), padding: t.spacing(4) }}>
      {/* اختيار المستودع */}
      {!repo ? (
        <>
          <Text style={{ color: t.colors.text, fontSize: t.font.title, fontWeight: '800' }}>
            {tr('integrations.readCaps')}
          </Text>
          {loading && <Text style={{ color: t.colors.textMuted }}>{tr('common.loading')}</Text>}
          {error ? <Text style={{ color: t.colors.danger }}>{error}</Text> : null}
          {repos.map((r) => (
            <Card key={r.full_name} dark={dark} onPress={() => setRepo(r.full_name)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="logo-github" size={16} color={t.colors.text} />
                <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.small, fontWeight: '700' }}>
                  {r.full_name}
                </Text>
              </View>
            </Card>
          ))}
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '800' }}>{repo}</Text>
            <Pressable onPress={() => { setRepo(null); setItems([]); }} hitSlop={10}>
              <Ionicons name="swap-horizontal-outline" size={20} color={t.colors.primary} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {TABS.map((x) => {
              const active = tab === x.key;
              return (
                <Pressable
                  key={x.key}
                  onPress={() => void loadTab(x.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? t.colors.chipBgActive : t.colors.chipBg,
                  }}
                >
                  <Text style={{ color: active ? t.colors.text : t.colors.textMuted, fontSize: t.font.tiny, fontWeight: '700' }}>
                    {lang === 'ar' ? x.ar : x.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Card dark={dark} style={{ backgroundColor: t.colors.accentDim, borderColor: t.colors.accentDim }}>
            <Text style={{ color: t.colors.accent, fontSize: t.font.tiny }}>{tr('integrations.writePolicy')}</Text>
          </Card>

          {loading && <Text style={{ color: t.colors.textMuted }}>{tr('common.loading')}</Text>}
          {error ? <Text style={{ color: t.colors.danger }}>{error}</Text> : null}
          {!loading && items.length === 0 && !error ? (
            <EmptyState dark={dark} icon="folder-open-outline" title={tr('history.empty')} />
          ) : null}

          {items.map((it) => (
            <Card key={it.id} dark={dark} onPress={it.onPress}>
              <Text numberOfLines={1} style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
                {it.title}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {it.subtitle && <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>{it.subtitle}</Text>}
                <Text
                  style={{ color: t.colors.primary, fontSize: t.font.tiny, fontWeight: '700' }}
                  onPress={() =>
                    setEvidenceModal({ title: `${repo} — ${it.title}`, content: it.subtitle ? `${it.title}\n${it.subtitle}` : it.title })
                  }
                >
                  + {tr('evidence.add')}
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Diff / محتوى ملف */}
      <BottomModal visible={!!diffModal} onClose={() => setDiffModal(null)} dark={dark} title={diffModal?.title ?? ''}>
        <MonoText dark={dark} small>{diffModal?.text ?? ''}</MonoText>
        <Btn
          dark={dark}
          icon="add-circle-outline"
          label={tr('evidence.add')}
          onPress={() => {
            if (diffModal) setEvidenceModal({ title: diffModal.title, content: diffModal.text });
            setDiffModal(null);
          }}
        />
      </BottomModal>

      {/* اختيار حالة للدليل */}
      <BottomModal visible={!!evidenceModal} onClose={() => setEvidenceModal(null)} dark={dark} title={tr('scanner.pickCase')}>
        {cases.map((c) => (
          <Card
            key={c.id}
            dark={dark}
            onPress={() => setSelectedCase(c.id)}
            style={{ borderColor: selectedCase === c.id ? t.colors.primary : t.colors.cardBorder }}
          >
            <Text numberOfLines={1} style={{ color: t.colors.text, fontSize: t.font.small, fontWeight: '600' }}>
              {selectedCase === c.id ? '✓ ' : ''}{c.title}
            </Text>
          </Card>
        ))}
        <Btn dark={dark} label={tr('evidence.add')} icon="checkmark" onPress={addAsEvidence} disabled={!selectedCase} />
      </BottomModal>

      {/* اقتراح كتابة: عرض → موافقة → تنفيذ */}
      <BottomModal visible={!!proposal} onClose={() => setProposal(null)} dark={dark} title="اقتراح تعليق على Issue">
        <Text style={{ color: t.colors.textMuted, fontSize: t.font.small }}>{tr('integrations.writePolicy')}</Text>
        <Field dark={dark} label="نص التعليق" value={commentText} onChangeText={setCommentText} multiline />
        <Card dark={dark}>
          <Text style={{ color: t.colors.textFaint, fontSize: t.font.tiny }}>
            الهدف: {proposal?.repo} — Issue #{proposal?.issueNumber}
          </Text>
        </Card>
        {proposalStatus ? <Text style={{ color: t.colors.success, fontSize: t.font.small }}>{proposalStatus}</Text> : null}
        <Btn
          dark={dark}
          icon="checkmark-circle-outline"
          label="وافق ونفّذ (موافقتك الصريحة)"
          disabled={!commentText.trim()}
          onPress={async () => {
            if (!proposal) return;
            proposal.body = commentText;
            proposal.status = 'approved';
            try {
              await githubClient.executeProposal(proposal);
              setProposalStatus('تم التنفيذ بنجاح.');
            } catch {
              setProposalStatus('فشل التنفيذ — تحقق من الصلاحيات.');
            }
          }}
        />
      </BottomModal>
    </View>
  );
}
