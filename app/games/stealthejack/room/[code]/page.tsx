import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomClient } from "@/games/stealthejack/components/RoomClient";
import { StatusScreen } from "@/components/ui/StatusScreen";

export const metadata: Metadata = {
  title: "Table · Steal the Jack",
  robots: { index: false },
};

async function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<StatusScreen busy title="Pulling up a chair…" />}>
      <Room params={params} />
    </Suspense>
  );
}
