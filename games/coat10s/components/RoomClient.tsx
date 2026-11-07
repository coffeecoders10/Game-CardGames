"use client";

import { RoomClient as Room } from "@/components/table/RoomClient";
import { storageCoat10s } from "@/games/coat10s/net/table";
import { useTable } from "@/games/coat10s/net/useTable";
import { Table } from "./Table";

export function RoomClient({ code }: { code: string }) {
  return (
    <Room
      code={code}
      slug="coat10s"
      storage={storageCoat10s}
      useTable={useTable}
      Table={Table}
      fullText="All six seats are already taken."
    />
  );
}
