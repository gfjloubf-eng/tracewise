/**
 * تكامل GitHub — READ ONLY افتراضيًا.
 * أي عملية كتابة تمر بدورة: اقتراح → موافقة المستخدم → تنفيذ.
 */
import { secureGet, secureSet, secureDelete } from '../storage/secureStorage';

const TOKEN_KEY = 'tw_github_token';
const API = 'https://api.github.com';

export interface GitHubIdentity {
  login: string;
  name?: string;
}

export interface GitHubProposal {
  id: string;
  kind: 'issue_comment';
  repo: string;
  issueNumber: number;
  body: string;
  createdAt: string;
  status: 'pending_approval' | 'approved' | 'executed' | 'rejected';
}

export class GitHubClient {
  private token: string | null = null;

  async loadToken(): Promise<boolean> {
    this.token = await secureGet(TOKEN_KEY);
    return !!this.token;
  }

  async connect(token: string): Promise<GitHubIdentity> {
    const me = await this.request<GitHubIdentity>('/user', token);
    this.token = token;
    await secureSet(TOKEN_KEY, token);
    return me;
  }

  async disconnect(): Promise<void> {
    this.token = null;
    await secureDelete(TOKEN_KEY);
  }

  get connected(): boolean {
    return !!this.token;
  }

  private headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private async request<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      headers: token
        ? { ...this.headers(), Authorization: `Bearer ${token}` }
        : this.headers(),
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status} — ${path}`);
    }
    return (await res.json()) as T;
  }

  // ——— عمليات القراءة فقط ———

  listRepos(): Promise<Array<{ full_name: string; private: boolean; updated_at: string }>> {
    return this.request('/user/repos?sort=pushed&per_page=30');
  }

  listFiles(owner: string, repo: string, path = '', ref?: string) {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    return this.request<Array<{ name: string; path: string; type: 'file' | 'dir' }>>(
      `/repos/${owner}/${repo}/contents/${path}${q}`
    );
  }

  getRepo(owner: string, repo: string) {
    return this.request<Record<string, unknown>>(`/repos/${owner}/${repo}`);
  }

  listBranches(owner: string, repo: string) {
    return this.request<Array<{ name: string }>>(`/repos/${owner}/${repo}/branches`);
  }

  listCommits(owner: string, repo: string, branch?: string) {
    const q = branch ? `?sha=${encodeURIComponent(branch)}&per_page=20` : '?per_page=20';
    return this.request<Array<{ sha: string; commit: { message: string } }>>(
      `/repos/${owner}/${repo}/commits${q}`
    );
  }

  getFile(owner: string, repo: string, path: string, ref?: string) {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    return this.request<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/contents/${path}${q}`
    );
  }

  listIssues(owner: string, repo: string) {
    return this.request<Array<{ number: number; title: string; state: string }>>(
      `/repos/${owner}/${repo}/issues?state=open&per_page=20`
    );
  }

  listPullRequests(owner: string, repo: string) {
    return this.request<Array<{ number: number; title: string; state: string }>>(
      `/repos/${owner}/${repo}/pulls?state=open&per_page=20`
    );
  }

  /** فك ترميز محتوى ملف (base64 → نص) */
  async getFileText(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const f = await this.getFile(owner, repo, path, ref);
    if (f.encoding === 'base64') {
      return global.atob(f.content.replace(/\n/g, ''));
    }
    return f.content;
  }

  async getDiff(owner: string, repo: string, sha: string): Promise<string> {
    const res = await fetch(`${API}/repos/${owner}/${repo}/commits/${sha}`, {
      headers: { ...this.headers(), Accept: 'application/vnd.github.diff' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status} — diff`);
    return res.text();
  }

  // ——— عملية الكتابة الوحيدة: مقترحة ثم منفذة بعد الموافقة ———

  proposeIssueComment(repo: string, issueNumber: number, body: string): GitHubProposal {
    return {
      id: `prop_${Date.now().toString(36)}`,
      kind: 'issue_comment',
      repo,
      issueNumber,
      body,
      createdAt: new Date().toISOString(),
      status: 'pending_approval',
    };
  }

  /** التنفيذ يحدث فقط بعد موافقة صريحة من المستخدم */
  async executeProposal(proposal: GitHubProposal): Promise<void> {
    if (proposal.status !== 'approved') {
      throw new Error('PROPOSAL_NOT_APPROVED');
    }
    if (!this.token) throw new Error('GITHUB_NOT_CONNECTED');
    const res = await fetch(
      `${API}/repos/${proposal.repo}/issues/${proposal.issueNumber}/comments`,
      {
        method: 'POST',
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: proposal.body }),
      }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status} — comment`);
    proposal.status = 'executed';
  }
}

export const githubClient = new GitHubClient();

/** صلاحيات القراءة المعروضة في مركز الأمان */
export const GITHUB_READ_PERMISSIONS_AR = [
  'قراءة معلومات المستودعات',
  'قراءة الملفات والفروع',
  'قراءة الـ Commits والـ Diffs',
  'قراءة الـ Issues والـ Pull Requests',
];
