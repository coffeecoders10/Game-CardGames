"use client";

import { RoomClient as Room } from "@/components/table/RoomClient";
import { storage7hearts } from "@/games/7hearts/net/table";
import { useTable } from "@/games/7hearts/net/useTable";
import { Table } from "./Table";

export function RoomClient({ code }: { code: string }) {
  return (
    <Room
      code={code}
      slug="7hearts"
      storage={storage7hearts}
      useTable={useTable}
      Table={Table}
      fullText="All ten seats are already taken."
    />
  );
}
