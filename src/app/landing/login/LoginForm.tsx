"use client";
// Import Library
import { type JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowRight, FiAtSign, FiEye, FiEyeOff, FiLock } from "react-icons/fi";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
// Import Components
import { Checkbox } from "@/src/app/components/ui/checkbox";
import { FieldError } from "@/src/app/components/shared/FieldError";
// Import Actions
import { login } from "@/src/app/lib/actions/auth";
// Import Client
import { SESSION_END_MESSAGES } from "@/src/app/lib/client/session";
// Import Types
import type { LoginFormValues, SessionEndReason } from "@/src/app/type/ui/login";
// Import Shared
import { NetworkError, fromActionError } from "@/src/app/lib/shared/http";
import { loginSchema } from "@/src/app/lib/shared/schemas/auth";

/* -------------------------------------- Component -------------------------------------- */

// Function ฟอร์มเข้าสู่ระบบ (reason/redirectTo มาจาก query string ที่หน้า server ตรวจแล้ว)
function LoginForm({ reason, redirectTo }: { reason: SessionEndReason | null; redirectTo: string }): JSX.Element {
    const router = useRouter();
    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting: loading },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { username: "", password: "", rememberMe: false },
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    // เหตุผลที่ session ก่อนจบ (จาก ?reason=) แสดงเหนือฟอร์มจนกว่าจะ login
    const [noticeDismissed, setNoticeDismissed] = useState(false);
    const notice = noticeDismissed || !reason ? "" : SESSION_END_MESSAGES[reason];
    // วินาทีที่เหลือก่อน login ได้อีกหลัง TOO_MANY_LOGIN_ATTEMPTS
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    // ตรวจว่ากรอกครบก่อนส่ง แล้วแสดงผลจาก backend เป็นข้อความเดียวด้านล่าง
    const submit = handleSubmit(async ({ username, password, rememberMe }) => {
        setError("");

        try {
            // server เก็บ token เป็น httpOnly cookie ไม่ส่ง unwrap เพราะ 401 ที่นี่คือรหัสผ่านผิด ไม่ใช่ session หมดอายุ
            const result = await login({ username, password, rememberMe }).catch(() => {
                throw new NetworkError();
            });

            if (result.ok) {
                setNoticeDismissed(true);
                router.replace(redirectTo);
                return;
            }

            const err = fromActionError(result.error);
            if (err.status === 429 || err.code === "TOO_MANY_LOGIN_ATTEMPTS") {
                setCooldown(err.retryAfterSeconds ? Math.ceil(err.retryAfterSeconds) : 60);
                setError("พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่");
            } else if (err.code === "VALIDATION_ERROR") {
                setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
            } else if (err.status >= 500) {
                setError(err.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง");
            } else {
                // 401 INVALID_CREDENTIALS และ error อื่นจาก backend
                setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
            }
        } catch {
            setError("ไม่สามารถเชื่อมต่อระบบได้");
        }
    });

    return (
        <section className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-8">
            <div className="w-full max-w-[520px]">
                <header className="mb-7 flex flex-col items-center text-center">
                    <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#9fd0ff] text-[28px] font-extrabold text-[#10233c] shadow-[0_8px_20px_rgba(80,150,220,0.18)]">
                        P
                    </div>

                    <h1 className="text-[32px] font-extrabold leading-tight text-slate-900">
                        Smart Carpark
                    </h1>

                    <p className="mt-2.5 text-[15px] text-gray-500">
                        ระบบบริหารลานจอดรถ
                    </p>
                </header>

                <div className="relative overflow-hidden rounded-[14px] bg-white px-8 py-7 shadow-[0_10px_30px_rgba(15,23,42,0.08)] max-sm:px-5 max-sm:py-6">
                    <div className="absolute top-0 left-0 h-1 w-full bg-[#10233c]" />

                    <form noValidate className="flex flex-col gap-[22px]" onSubmit={(event) => void submit(event)}>
                        <div className="flex flex-col gap-2.5">
                            <label htmlFor="username" className="text-sm font-semibold text-gray-600">
                                ชื่อผู้ใช้ / อีเมล
                            </label>

                            <div className="flex min-h-14 items-center gap-3 rounded-lg border border-transparent bg-[#dfeaf2] px-4 transition focus-within:border-[#8cb9e6] focus-within:shadow-[0_0_0_3px_rgba(140,185,230,0.2)]">
                                <FiAtSign className="h-5 w-5 shrink-0 text-slate-500" />
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="name@facility.com"
                                    autoComplete="username"
                                    aria-invalid={Boolean(errors.username)}
                                    {...register("username")}
                                    className="w-full border-0 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                                />
                            </div>
                            <FieldError message={errors.username?.message} className="mt-0" />
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <label htmlFor="password" className="text-sm font-semibold text-gray-600">
                                รหัสผ่าน
                            </label>

                            <div className="flex min-h-14 items-center gap-3 rounded-lg border border-transparent bg-[#dfeaf2] px-4 transition focus-within:border-[#8cb9e6] focus-within:shadow-[0_0_0_3px_rgba(140,185,230,0.2)]">
                                <FiLock className="h-5 w-5 shrink-0 text-slate-500" />

                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    aria-invalid={Boolean(errors.password)}
                                    {...register("password")}
                                    className="w-full border-0 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                    className="flex shrink-0 items-center justify-center bg-transparent text-xl text-gray-500"
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                            <FieldError message={errors.password?.message} className="mt-0" />
                        </div>

                        <div className="mt-[-2px] flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
                            <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-gray-500">
                                <Controller
                                    control={control}
                                    name="rememberMe"
                                    render={({ field }) => (
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={(checked) => field.onChange(checked === true)}
                                            className="size-[18px] border-[#d1d9e0] bg-[#dfeaf2] data-[state=checked]:border-[#10233c] data-[state=checked]:bg-[#10233c]"
                                        />
                                    )}
                                />
                                <span>จดจำการเข้าสู่ระบบ</span>
                            </label>

                            <button
                                type="button"
                                className="text-sm font-bold text-[#10233c] hover:underline"
                            >
                                ลืมรหัสผ่าน
                            </button>
                        </div>

                        {notice && !error ? (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                                {notice}
                            </p>
                        ) : null}

                        {error ? (
                            <p className="text-sm font-medium text-red-600">{error}</p>
                        ) : null}

                        <button
                            type="submit"
                            disabled={loading || cooldown > 0}
                            className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-[10px] bg-[#071a2f] text-[21px] font-bold text-white shadow-[0_8px_20px_rgba(7,26,47,0.18)] transition hover:opacity-95 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span>
                                {loading
                                    ? "กำลังเข้าสู่ระบบ..."
                                    : cooldown > 0
                                        ? `ลองใหม่ได้ใน ${cooldown} วินาที`
                                        : "เข้าสู่ระบบ"}
                            </span>
                            <FiArrowRight className="h-[22px] w-[22px]" />
                        </button>
                    </form>

                    <div className="my-7 h-px bg-gray-200" />

                    <p className="text-center text-sm text-gray-500">
                        ระบบมีการตรวจสอบการเข้าใช้งาน,{" "}
                        <strong className="font-bold text-[#10233c]">กรุณาเข้าสู่ระบบ</strong>
                    </p>
                </div>
            </div>
        </section>
    );
}

export { LoginForm };
