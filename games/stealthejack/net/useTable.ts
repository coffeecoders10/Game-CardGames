"use client";

import { type Notice, type TableStatus, useTableSession } from "@/lib/net/useTable";
import { adapterStealTheJack } from "./table";

export type { Notice, TableStatus };

export const useTable = (code: string, name: string, hosting: boolean) =>
  useTableSession(adapterStealTheJack, code, name, hosting);
