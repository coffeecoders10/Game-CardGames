"use client";

import { type Notice, type TableStatus, useTableSession } from "@/lib/net/useTable";
import { adapterCoat10s } from "./table";

export type { Notice, TableStatus };

export const useTable = (code: string, name: string, hosting: boolean) =>
  useTableSession(adapterCoat10s, code, name, hosting);
