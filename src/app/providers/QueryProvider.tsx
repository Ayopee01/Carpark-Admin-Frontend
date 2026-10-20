"use client";
// Import Library
import { useState, type ReactNode, type JSX } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Import Shared
import { ApiError } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config ข้อมูลที่โหลดแล้วใช้ซ้ำได้โดยไม่โหลดใหม่ (ข้อมูล realtime ถูกเขียนทับจาก Socket.IO อยู่แล้ว)
const STALE_TIME_MS = 30_000;

// Config จำนวนครั้งที่ลองใหม่เมื่อเน็ตหรือ 5xx (4xx ลองใหม่ก็ไม่หาย 401/403 จัดการที่ lib/client/http แล้ว)
const MAX_RETRIES = 2;

/* -------------------------------------- Helpers -------------------------------------- */

// Function สร้าง QueryClient ของแท็บ
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        // หน้าเดิมไม่โหลดใหม่ตอนกลับมาที่แท็บ ข้อมูลที่เปลี่ยนบ่อยมาทาง realtime
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < MAX_RETRIES;
        },
      },
      mutations: { retry: false },
    },
  });
}

/* -------------------------------------- Component -------------------------------------- */

// Function ให้ cache ของ TanStack Query กับหน้าหลังบ้าน (สร้างครั้งเดียวต่อแท็บ)
function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export { QueryProvider };
