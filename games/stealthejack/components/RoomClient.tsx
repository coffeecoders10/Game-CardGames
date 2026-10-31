"use client";

import { RoomClient as Room } from "@/components/table/RoomClient";
import { storageStealTheJack } from "@/games/stealthejack/net/table";
import { useTable } from "@/games/stealthejack/net/useTable";
import { Table } from "./Table";

export function RoomClient({ code }: { code: string }) {
  return (
    <Room
      code={code}
      slug="stealthejack"
      storage={storageStealTheJack}
      useTable={useTable}
      Table={Table}
      fullText="All six seats are already taken."
    />
  );
}
