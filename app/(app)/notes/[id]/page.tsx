import { DocEditPage } from "@/components/DocPages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocEditPage kind="notes" id={id} />;
}
