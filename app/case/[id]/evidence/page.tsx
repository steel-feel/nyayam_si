import { notFound } from "next/navigation";
import BenchTopBar from "../../../components/BenchTopBar";
import { fetchCase } from "../../../lib/cases";
import EvidenceClient from "./EvidenceClient";

// Case data comes from the backend database at request time.
export const dynamic = "force-dynamic";

export default async function EvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await fetchCase(id);
  if (!bundle) notFound();
  const c = bundle.case;
  return (
    <>
      <BenchTopBar />
      <EvidenceClient slug={c.slug} caseNumber={c.caseNumber} title={c.title} />
    </>
  );
}
