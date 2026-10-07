import { OnlineGame } from "@/components/OnlineGame";
import { Suspense } from "react";

export default function GamePage({ params }: PageProps<"/partie/[code]">) {
  return (
    <Suspense fallback={null}>
      <GameLoader params={params} />
    </Suspense>
  );
}

async function GameLoader({ params }: { params: PageProps<"/partie/[code]">["params"] }) {
  const { code } = await params;
  return <OnlineGame code={code.toUpperCase()} />;
}
