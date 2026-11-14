import { DocListPage } from "@/components/DocPages";

export default async function Page({ searchParams }: { searchParams: Promise<{ tag?: string; q?: string }> }) {
  const { tag, q } = await searchParams;
  return <DocListPage kind="notes" tag={tag} q={q} />;
}
