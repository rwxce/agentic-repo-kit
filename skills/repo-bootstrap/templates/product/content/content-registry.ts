/**
 * WHAT: Typed content registry (content module): which posts, comparison pages and changelog
 *   entries exist, their dates, and the date their third-party facts were last checked. Text lives
 *   in the i18n messages under the item's key, so every locale shares this structure. The sitemap,
 *   the index pages, static params, RSS and (optionally) llms.txt read this file, never a copy.
 * REPO SIGNAL: a blog, docs, comparison ("vs") pages or a public changelog on the product's site.
 * CONFIGURE: replace the sample items; set CONTENT_RULES (fact age, forbidden changelog words).
 *   Erasable TypeScript only (no enums/namespaces), so Node can strip the types and the
 *   zero-dependency test runs with `node --test` (Node >= 22.18) as well as under Vitest/Jest.
 * The guard is `content-registry.test.mjs`; pair it with `arch-tests/content-assets-exist.test.ts`
 * for covers and per-locale body files on disk.
 */

/** ISO date, YYYY-MM-DD. */
export type IsoDate = string

export type Post = {
  /** Same slug in every locale, so hreflang pairs are trivial. */
  slug: string
  /** Key under `Blog.posts.<key>` in the messages. */
  key: string
  category: string
  publishedAt: IsoDate
  /** Only when the post was materially revised. */
  updatedAt?: IsoDate
  /**
   * Last date every statement about a third-party tool in the post was checked against that
   * tool's public pages. Set it only on posts that make such statements; the page shows it.
   */
  factsCheckedOn?: IsoDate
  cover: string
  ogImage: string
}

export type Comparison = {
  slug: string
  /** Key under `Comparisons.<key>` in the messages. */
  key: string
  competitorName: string
  competitorUrl: string
  /** Last date every claim about the competitor was re-read on its public pages. Shown on the page. */
  checkedOn: IsoDate
}

export type ChangelogRelease = { version: string; date: IsoDate }

export type ChangelogEntry = {
  /** Key under `Changelog.entries.<key>` in the messages. */
  key: string
  /** Minor version the entry covers, e.g. "1.5". One entry per minor, patches folded in. */
  minor: string
  /** Releases folded into this entry, newest first. */
  releases: ChangelogRelease[]
}

type ItemText = { title?: string; description?: string; summary?: string; items?: string[] }
/** Per locale: the slice of the messages this registry needs. */
export type ContentMessages = Record<string, {
  posts?: Record<string, ItemText>
  comparisons?: Record<string, ItemText>
  changelog?: Record<string, ItemText>
}>

export const CONTENT_RULES = {
  /** A third-party fact older than this fails the test until someone re-checks it. */
  maxFactAgeDays: 90,
  /**
   * Words that would publish an incident, a vendor or a promise in the public changelog. A safety
   * net only; the founder's review of each entry is the real check. Add your vendors' names.
   */
  forbiddenInChangelog: [
    /\b(bug|crash|outage|incident|vulnerab|exploit|security|hotfix)\b/i,
    /\b(coming soon|on the roadmap|next month)\b/i,
  ],
}

// ---------------------------------------------------------------- sample data (replace)

export const POSTS: readonly Post[] = [
  {
    slug: 'how-to-choose-a-tool',
    key: 'chooseTool',
    category: 'guides',
    publishedAt: '2026-10-01',
    factsCheckedOn: '2026-11-15',
    cover: '/images/blog/how-to-choose-a-tool.webp',
    ogImage: '/images/blog/how-to-choose-a-tool-og.png',
  },
  {
    slug: 'why-we-build-this',
    key: 'whyWeBuild',
    category: 'founderNotes',
    publishedAt: '2026-09-10',
    cover: '/images/blog/why-we-build-this.webp',
    ogImage: '/images/blog/why-we-build-this-og.png',
  },
]

export const COMPARISONS: readonly Comparison[] = [
  { slug: 'acme', key: 'acme', competitorName: 'Acme', competitorUrl: 'https://acme.example', checkedOn: '2026-11-01' },
]

export const CHANGELOG: readonly ChangelogEntry[] = [
  { key: 'v1_1', minor: '1.1', releases: [{ version: '1.1.1', date: '2026-11-18' }, { version: '1.1.0', date: '2026-11-10' }] },
  { key: 'v1_0', minor: '1.0', releases: [{ version: '1.0.0', date: '2026-10-20' }] },
]

// ---------------------------------------------------------------- helpers

export const getPost = (slug: string): Post | undefined => POSTS.find((p) => p.slug === slug)
export const postPath = (post: Post): string => `/blog/${post.slug}`
export const comparisonPath = (c: Comparison): string => `/vs/${c.slug}`

// ---------------------------------------------------------------- validation (used by the test)

const ISO = /^\d{4}-\d{2}-\d{2}$/
const isIso = (d: string): boolean => ISO.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`))
const daysBetween = (a: string, b: Date): number => Math.floor((b.getTime() - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
const semver = (v: string): number[] => v.split('.').map(Number)
function newer(a: string, b: string): boolean {
  const [x, y] = [semver(a), semver(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0)
  }
  return false
}

function unique(list: readonly { slug?: string; key: string }[], label: string, out: string[]): void {
  const keys = list.map((i) => i.key)
  const slugs = list.map((i) => i.slug).filter(Boolean)
  if (new Set(keys).size !== keys.length) out.push(`${label}: duplicate key`)
  if (new Set(slugs).size !== slugs.length) out.push(`${label}: duplicate slug`)
}

export type ContentInput = {
  posts: readonly Post[]
  comparisons: readonly Comparison[]
  changelog: readonly ChangelogEntry[]
  messages: ContentMessages
  locales: readonly string[]
  today: Date
  rules?: typeof CONTENT_RULES
}

/** Every problem in the registry, as human-readable lines. Empty = valid. */
export function validateContent(input: ContentInput): string[] {
  const { posts, comparisons, changelog, messages, locales, today } = input
  const rules = input.rules ?? CONTENT_RULES
  const out: string[] = []
  unique(posts, 'posts', out)
  unique(comparisons, 'comparisons', out)
  unique(changelog, 'changelog', out)

  const fresh = (label: string, date: string | undefined): void => {
    if (date === undefined) return
    if (!isIso(date)) out.push(`${label}: "${date}" is not an ISO date`)
    else if (daysBetween(date, today) > rules.maxFactAgeDays) {
      out.push(`${label}: facts last checked ${date}, older than ${rules.maxFactAgeDays} days — re-check and bump the date`)
    }
  }

  for (const p of posts) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) out.push(`post ${p.slug}: slug must be kebab-case`)
    if (!isIso(p.publishedAt)) out.push(`post ${p.slug}: publishedAt is not an ISO date`)
    else if (daysBetween(p.publishedAt, today) < 0) out.push(`post ${p.slug}: publishedAt is in the future`)
    if (p.updatedAt && (!isIso(p.updatedAt) || p.updatedAt < p.publishedAt)) out.push(`post ${p.slug}: updatedAt before publishedAt`)
    fresh(`post ${p.slug}`, p.factsCheckedOn)
    for (const l of locales) {
      const t = messages[l]?.posts?.[p.key]
      if (!t?.title || !t?.description) out.push(`post ${p.slug}: missing title/description in ${l}`)
    }
  }

  for (const c of comparisons) {
    if (!c.competitorUrl.startsWith('https://')) out.push(`comparison ${c.slug}: competitorUrl must be https`)
    fresh(`comparison ${c.slug}`, c.checkedOn)
    for (const l of locales) {
      const t = messages[l]?.comparisons?.[c.key]
      if (!t?.title || !t?.description) out.push(`comparison ${c.slug}: missing title/description in ${l}`)
    }
  }

  changelog.forEach((e, i) => {
    if (i > 0 && !newer(changelog[i - 1].minor, e.minor)) out.push(`changelog ${e.key}: entries must be newest first`)
    e.releases.forEach((r, j) => {
      if (!r.version.startsWith(`${e.minor}.`)) out.push(`changelog ${e.key}: release ${r.version} is not part of ${e.minor}`)
      if (!isIso(r.date)) out.push(`changelog ${e.key}: release ${r.version} date is not ISO`)
      if (j > 0 && !newer(e.releases[j - 1].version, r.version)) out.push(`changelog ${e.key}: releases must be newest first`)
    })
    for (const l of locales) {
      const t = messages[l]?.changelog?.[e.key]
      if (!t?.title || !t?.summary) out.push(`changelog ${e.key}: missing title/summary in ${l}`)
      const text = [t?.title, t?.summary, ...(t?.items ?? [])].filter(Boolean).join(' ')
      for (const re of rules.forbiddenInChangelog) {
        if (re.test(text)) out.push(`changelog ${e.key} (${l}): forbidden word ${re}`)
      }
    }
  })
  return out
}
