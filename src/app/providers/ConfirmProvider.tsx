"use client";
// Import Library
import { createContext, useCallback, useContext, useRef, useState, type JSX, type ReactNode } from "react";
// Import Components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/src/app/components/ui/alert-dialog";
// Import Types
import type { ConfirmOptions } from "@/src/app/type/ui/shared";

/* -------------------------------------- Config -------------------------------------- */

// Config context ของ dialog ยืนยัน ค่าเริ่มต้นเมื่อไม่ได้อยู่ใต้ provider (ตอบ ยกเลิก เสมอ)
const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

/* -------------------------------------- Functions -------------------------------------- */

// Function hook ถามยืนยันแทน window.confirm ใช้ await confirm({ ... }) ได้ true เมื่อกดยืนยัน
function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
    return useContext(ConfirmContext);
}

/* -------------------------------------- Component -------------------------------------- */

// Function ให้ทุกหน้าถามยืนยันผ่าน AlertDialog ตัวเดียว (Escape/ยกเลิก = false)
function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [open, setOpen] = useState(false);
    const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

    const confirm = useCallback((next: ConfirmOptions) => {
        // ถามซ้อนกัน ให้คำถามเดิมเป็น ยกเลิก
        resolveRef.current?.(false);
        setOptions(next);
        setOpen(true);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    function settle(confirmed: boolean) {
        resolveRef.current?.(confirmed);
        resolveRef.current = null;
        setOpen(false);
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <AlertDialog open={open} onOpenChange={(next) => !next && settle(false)}>
                <AlertDialogContent>
                    <AlertDialogTitle>{options?.title}</AlertDialogTitle>
                    <AlertDialogDescription>{options?.description}</AlertDialogDescription>
                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <AlertDialogCancel>{options?.cancelLabel ?? "ยกเลิก"}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => settle(true)}
                            className={options?.destructive ? "bg-[#DC2626]" : undefined}
                        >
                            {options?.confirmLabel ?? "ยืนยัน"}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}

export { useConfirm, ConfirmProvider };
