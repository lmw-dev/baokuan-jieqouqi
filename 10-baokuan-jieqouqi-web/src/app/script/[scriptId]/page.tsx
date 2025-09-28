import { ScriptDetailClient } from "@/components/script/ScriptDetailClient"

interface ScriptDetailPageProps {
  params: Promise<{ scriptId: string }>
}

export default async function ScriptDetailPage({ params }: ScriptDetailPageProps) {
  const { scriptId } = await params
  return <ScriptDetailClient scriptId={scriptId} />
}