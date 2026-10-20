"use client";
// Import Library
import { useEffect, useState, type JSX } from "react";
// Import Client
import { SESSION_WARNING_MS, getSessionExpiresAt, logout } from "@/src/app/lib/client/session";

// Config ระยะอัปเดตเวลาที่เหลือ
const TICK_MS = 15_000;

// Function เตือนก่อนถึงเพดาน 12 ชม. ของ session ซึ่ง refresh ต่อไม่ได้ ต้อง login ใหม่
function SessionExpiryBanner(): JSX.Element | null {
    const [msLeft, setMsLeft] = useState<number | null>(null);

    useEffect(() => {
        function update() {
            const expiresAt = getSessionExpiresAt();
            setMsLeft(expiresAt ? expiresAt - Date.now() : null);
        }

        update();
        // เพดาน 12 ชม. ไม่เปลี่ยนตลอด session อัปเดตตามเวลาก็พอ
        const timer = window.setInterval(update, TICK_MS);
        document.addEventListener("visibilitychange", update);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", update);
        };
    }, []);

    if (msLeft === null || msLeft > SESSION_WARNING_MS || msLeft <= 0) return null;

    const minutes = Math.max(1, Math.ceil(msLeft / 60_000));

    return (
        <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:px-8"
        >
            <span className="font-medium">
                เซสชันจะหมดอายุใน {minutes} นาที กรุณาบันทึกงานและเข้าสู่ระบบใหม่
            </span>
            <button
                type="button"
                onClick={() => void logout({ returnHere: true })}
                className="rounded-full bg-amber-900 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
            >
                เข้าสู่ระบบใหม่
            </button>
        </div>
    );
}

export { SessionExpiryBanner };
