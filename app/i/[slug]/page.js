import AppShell from '@/components/AppShell';

// Public respondent page — no auth required. The share slug is passed to
// the shell, which fetches the interview content from /api/shares/slug/[slug].
export default function RespondentPage({ params }) {
  return <AppShell shareSlug={params.slug} />;
}
