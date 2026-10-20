"use client";
// Import Library
import { useEffect, useMemo, useRef, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
// Import Actions
import { deleteLogo, updateTheme, uploadLogo } from "@/src/app/lib/actions/theme";
// Import Client
import { queryKeys, resolveLogoUrl, themeQuery } from "@/src/app/lib/client/queries";
import { unwrap } from "@/src/app/lib/client/http";
// Import Types
import type { CustomColorEditorProps, ThemeOptionCardProps, ThemeColorOption, ThemeForm, ThemeMode, ThemePutPayload, ThemeState } from "@/src/app/type/ui/device";
import type { Theme } from "@/src/app/type/api/theme";
// Import Shared
import { getErrorMessage } from "@/src/app/lib/shared/http";
import { HEX_COLOR_PATTERN, themeFormSchema } from "@/src/app/lib/shared/schemas/device";

/* -------------------------------------- Config -------------------------------------- */

// Config สีที่ใช้เมื่อสีของธีมว่างหรือไม่ใช่ HEX
const DEFAULT_THEME_COLOR = "#FFD54F";

// Config สีเริ่มต้นของสีกำหนดเอง
const DEFAULT_CUSTOM_COLOR = "#FFD54F";

// Config ธีมสำเร็จรูปและสีกำหนดเอง
const THEME_OPTIONS: Record<ThemeMode, ThemeColorOption> = {
    theme1: {
        mode: "theme1",
        title: "ธีม 01",
        subtitle: DEFAULT_THEME_COLOR,
        color: DEFAULT_THEME_COLOR,
    },
    theme2: {
        mode: "theme2",
        title: "ธีม 02",
        subtitle: "#1D4ED8",
        color: "#1D4ED8",
    },
    theme3: {
        mode: "theme3",
        title: "ธีม 03",
        subtitle: "#047857",
        color: "#047857",
    },
    custom: {
        mode: "custom",
        title: "Custom",
        subtitle: DEFAULT_CUSTOM_COLOR,
        color: DEFAULT_CUSTOM_COLOR,
    },
};

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตรวจว่าเป็นสี HEX 6 หลัก
function isHexColor(value: string): boolean {
    return HEX_COLOR_PATTERN.test(value);
}

// Function ทำค่าสีที่พิมพ์ให้เป็นรูปแบบ #RRGGBB ตัวใหญ่
function normalizeHexInput(value: string): string {
    const cleaned = value.trim().replace(/[^#0-9a-fA-F]/g, "");
    const withoutHash = cleaned.startsWith("#") ? cleaned.slice(1) : cleaned;

    return `#${withoutHash.slice(0, 6).toUpperCase()}`;
}

// Function แปลงธีมจาก backend เป็นค่าที่หน้าแสดง ("" = ยังไม่เลือก แสดงเป็น theme1, สีที่ไม่มีใช้สีของธีม)
function normalizeTheme(value: Theme): ThemeState {
    const themeMode: ThemeMode = value.themeMode === "" ? "theme1" : value.themeMode;
    const customThemeColor = value.customThemeColor ?? DEFAULT_CUSTOM_COLOR;
    const themeColor =
        themeMode === "custom" ? customThemeColor : value.themeColor ?? THEME_OPTIONS[themeMode].color;

    return {
        themeColor,
        // /uploads/... โหลดผ่าน Route Handler /uploads ของหน้าเว็บที่ส่งต่อจาก backend
        logoUrl: resolveLogoUrl(value.logoUrl),
        configUpdatedAt: value.configUpdatedAt,
        themeMode,
        customThemeColor,
        updatedAt: value.updatedAt,
    };
}

// Function ดึงสีที่ใช้จริงของธีมที่เลือก
function getThemeOptionColor(mode: ThemeMode, customColor: string): string {
    if (mode === "custom") {
        return isHexColor(customColor) ? customColor : DEFAULT_CUSTOM_COLOR;
    }

    return THEME_OPTIONS[mode].color;
}

// Function ตั้งสีของธีมเป็น CSS variable ของหน้าเว็บ
function applyThemeColorToRoot(themeColor: string): void {
    if (typeof document === "undefined") return;
    if (!isHexColor(themeColor)) return;

    const root = document.documentElement;

    root.style.setProperty("--theme", themeColor);
    root.style.setProperty("--keyboard-confirm", themeColor);
}

/* -------------------------------------- Component -------------------------------------- */

// Function การ์ดเลือกธีมหนึ่งใบ
function ThemeOptionCard({
    title,
    subtitle,
    color,
    selected,
    active,
    onClick,
}: ThemeOptionCardProps): JSX.Element {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`min-h-[108px] rounded-[14px] border bg-[#E9EEF3] px-4 py-3 text-left transition ${selected
                ? "border-[#0D1B2A] shadow-[0_0_0_1px_#0D1B2A]"
                : "border-transparent hover:border-[#CBD5E1]"
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div
                    className="h-7 w-[84px] rounded-[4px] border border-white/80 shadow-sm"
                    style={{ backgroundColor: color }}
                />

                {active ? (
                    <span className="rounded-md bg-[#DCE6F2] px-2 py-1 text-[10px] font-bold text-[#4B5563]">
                        ใช้งานอยู่
                    </span>
                ) : null}
            </div>

            <div className="mt-4 text-[14px] font-extrabold text-[#2B3640]">
                {title}
            </div>

            <div className="mt-1 text-[12px] font-semibold text-[#6B7280]">
                {subtitle}
            </div>
        </button>
    );
}

// Function ตัวเลือกสีกำหนดเอง ทั้ง color picker และช่องพิมพ์ HEX
function CustomColorEditor({ value, onChange }: CustomColorEditorProps): JSX.Element {
    const safeColor = isHexColor(value) ? value : DEFAULT_CUSTOM_COLOR;

    function handleChange(nextValue: string) {
        onChange(normalizeHexInput(nextValue));
    }

    return (
        <div className="rounded-[24px] border border-[#D8DEE5] bg-white p-6">
            <div className="mb-6 text-center text-[18px] font-extrabold text-[#2B3640] md:text-[20px]">
                เลือกสีหลัก 1 สี
            </div>

            <div className="rounded-[16px] bg-[#E9EEF3] p-4">
                <div className="text-[12px] font-semibold text-[#667085]">
                    สี Custom
                </div>

                <div className="mt-3 flex items-center gap-3">
                    <input
                        type="color"
                        value={safeColor}
                        onChange={(event) =>
                            handleChange(event.target.value.toUpperCase())
                        }
                        className="h-11 w-11 shrink-0 cursor-pointer rounded-[6px] border border-white bg-transparent p-0 shadow-sm"
                        aria-label="เลือกสี Custom"
                    />

                    <input
                        value={value}
                        onChange={(event) => handleChange(event.target.value)}
                        placeholder="#FFD54F"
                        className={`h-11 flex-1 rounded-[10px] border bg-white px-4 text-[15px] font-semibold outline-none ${isHexColor(value)
                            ? "border-[#D0D5DD] text-[#1F2937]"
                            : "border-red-300 text-red-600"
                            }`}
                    />
                </div>

                {!isHexColor(value) ? (
                    <div className="mt-3 text-[12px] font-semibold text-red-500">
                        กรุณากรอกค่าสีแบบ HEX เช่น #FFD54F
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// Function แท็บธีม เลือกสีและอัปโหลด/ลบโลโก้
function ThemeTab(): JSX.Element {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const queryClient = useQueryClient();

    const { data, isPending: loading, error: loadError } = useQuery(themeQuery());
    const theme = useMemo(() => (data ? normalizeTheme(data) : null), [data]);
    const error = loadError ? getErrorMessage(loadError, "โหลดข้อมูลธีมไม่สำเร็จ") : "";

    // ค่าจาก backend เข้าฟอร์มทุกครั้งที่โหลดใหม่ ช่องที่กำลังแก้อยู่ไม่ถูกทับ
    const formValues = useMemo<ThemeForm | undefined>(
        () => (theme ? { themeMode: theme.themeMode, customColor: theme.customThemeColor } : undefined),
        [theme]
    );
    const { control, handleSubmit, reset, setValue } = useForm<ThemeForm>({
        resolver: zodResolver(themeFormSchema),
        defaultValues: { themeMode: "theme1", customColor: DEFAULT_CUSTOM_COLOR },
        values: formValues,
        resetOptions: { keepDirtyValues: true },
    });
    const selectedThemeMode = useWatch({ control, name: "themeMode" });
    const customColor = useWatch({ control, name: "customColor" });
    // สีที่ใช้จริง สี Custom ที่ยังพิมพ์ไม่ครบใช้สีเริ่มต้นแทน
    const themeColor = getThemeOptionColor(selectedThemeMode, customColor);

    // แสดงสีที่เลือกบนหน้าเว็บทันที (ยกเลิก = กลับเป็นสีที่บันทึกไว้)
    useEffect(() => {
        if (theme) applyThemeColorToRoot(themeColor);
    }, [theme, themeColor]);

    // ใส่ธีมที่ backend ตอบกลับลง cache เลย ไม่ต้องโหลดใหม่
    function storeTheme(result: Theme) {
        queryClient.setQueryData(queryKeys.theme, result);
    }

    const saveTheme = useMutation({
        mutationFn: (payload: ThemePutPayload) => unwrap(updateTheme(payload)),
        onSuccess: (result) => storeTheme(result.theme),
    });

    // ชนิดและขนาดไฟล์ backend ตรวจ (ผิดได้ 400 INVALID_LOGO_FILE)
    const uploadThemeLogo = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append("logo", file);
            return unwrap(uploadLogo(formData));
        },
        onSuccess: (result) => {
            storeTheme(result.theme);
            toast.success("อัปโหลดโลโก้สำเร็จ");
        },
        onError: (err) => toast.error(getErrorMessage(err, "อัปโหลดโลโก้ไม่สำเร็จ")),
    });

    const removeThemeLogo = useMutation({
        mutationFn: () => unwrap(deleteLogo()),
        onSuccess: (result) => {
            storeTheme(result.theme);
            toast.success("ลบโลโก้สำเร็จ");
        },
        onError: (err) => toast.error(getErrorMessage(err, "ลบโลโก้ไม่สำเร็จ")),
    });

    const saving = saveTheme.isPending;
    const uploadingLogo = uploadThemeLogo.isPending || removeThemeLogo.isPending;

    const colorOptions = useMemo<ThemeColorOption[]>(() => {
        const safeCustomColor = isHexColor(customColor)
            ? customColor
            : DEFAULT_CUSTOM_COLOR;

        return [
            THEME_OPTIONS.theme1,
            THEME_OPTIONS.theme2,
            THEME_OPTIONS.theme3,
            {
                ...THEME_OPTIONS.custom,
                subtitle: safeCustomColor,
                color: safeCustomColor,
            },
        ];
    }, [customColor]);

    function handleSelectThemeMode(mode: ThemeMode) {
        setValue("themeMode", mode, { shouldDirty: true });
    }

    function handleCustomColorChange(value: string) {
        setValue("customColor", value, { shouldDirty: true });
        setValue("themeMode", "custom", { shouldDirty: true });
    }

    const handleSave = handleSubmit(
        async (values) => {
            const nextColor = getThemeOptionColor(values.themeMode, values.customColor);
            try {
                // ส่งเฉพาะสี โลโก้มี endpoint แยก
                await saveTheme.mutateAsync({
                    themeColor: nextColor,
                    themeMode: values.themeMode,
                    customThemeColor: values.themeMode === "custom" ? values.customColor : theme?.customThemeColor ?? DEFAULT_CUSTOM_COLOR,
                });
                reset(values);
                toast.success("บันทึกธีมสำเร็จ");
            } catch (err) {
                toast.error(getErrorMessage(err, "บันทึกธีมไม่สำเร็จ"));
            }
        },
        (errors) => toast.error(errors.customColor?.message ?? "กรุณาเลือกค่าสีให้ถูกต้อง เช่น #FFD54F")
    );

    function handleCancel() {
        if (formValues) reset(formValues);
    }

    function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file && theme) uploadThemeLogo.mutate(file);
    }

    function handleRemoveLogo() {
        if (theme) removeThemeLogo.mutate();
    }

    if (loading) {
        return (
            <>
                <h2 className="mb-6 flex items-center gap-3 text-[20px] font-extrabold text-[#2B3640]">
                    <span className="h-6 w-1 rounded-full bg-[#1F2933]" />
                    การตั้งค่าธีม
                </h2>

                <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="min-h-[360px] animate-pulse rounded-2xl bg-[#E4E6E8]" />
                    <div className="min-h-[360px] animate-pulse rounded-[24px] bg-[#E4E6E8]" />
                </div>
            </>
        );
    }

    if (!theme) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error || "ไม่พบข้อมูลธีมจาก API"}
            </div>
        );
    }

    return (
        <>
            <h2 className="mb-6 flex items-center gap-3 text-[20px] font-extrabold text-[#2B3640]">
                <span className="h-6 w-1 rounded-full bg-[#1F2933]" />
                การตั้งค่าธีม
            </h2>

            {error ? (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            ) : null}

            <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0 rounded-2xl bg-[#F8F8F8] p-4 sm:p-6">
                    <div className="text-[18px] font-extrabold text-[#2B3640]">
                        ธีมที่มีอยู่
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {colorOptions.map((option) => (
                            <ThemeOptionCard
                                key={option.mode}
                                title={option.title}
                                subtitle={option.subtitle}
                                color={option.color}
                                selected={selectedThemeMode === option.mode}
                                active={theme.themeMode === option.mode}
                                onClick={() => handleSelectThemeMode(option.mode)}
                            />
                        ))}
                    </div>

                    {selectedThemeMode === "custom" ? (
                        <div className="mt-8">
                            <CustomColorEditor
                                value={customColor}
                                onChange={handleCustomColorChange}
                            />
                        </div>
                    ) : null}

                    <div className="mt-8 rounded-2xl border border-[#E0E2E6] bg-white p-6">
                        <div className="mb-5 text-[18px] font-extrabold text-[#2B3640]">
                            โลโก้
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                        />

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingLogo}
                                className="h-10 rounded-md bg-[#0D1B2A] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {uploadingLogo ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}
                            </button>

                            {theme.logoUrl ? (
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    disabled={uploadingLogo}
                                    className="h-10 rounded-md border border-[#D0D5DD] bg-white px-4 text-[13px] font-semibold text-[#667085] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    ลบโลโก้
                                </button>
                            ) : null}
                        </div>

                        {theme.logoUrl ? (
                            <div className="mt-4 rounded-lg border border-[#D0D5DD] bg-white p-3">
                                {/* eslint-disable-next-line @next/next/no-img-element -- โลโก้มาจาก API คนละโดเมนหรือ blob ของไฟล์ที่เลือก */}
                                <img
                                    src={theme.logoUrl}
                                    alt="Logo preview"
                                    className="h-16 max-w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg border border-dashed border-[#C7CDD5] bg-white px-3 py-5 text-center text-[12px] text-[#98A2B3]">
                                ยังไม่มีโลโก้
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-[24px] border border-[#667085] bg-[#F8F8F8] p-5">
                    <div className="text-[24px] font-extrabold text-[#2B3640]">
                        ตัวอย่าง
                    </div>

                    <div className="mt-2 text-[13px] font-semibold text-[#667085]">
                        สีที่เลือก: {themeColor}
                    </div>

                    <div className="mt-5 rounded-xl bg-[#EFEFEF] p-4">
                        <div className="rounded-xl bg-white p-4">
                            {theme.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- โลโก้มาจาก API คนละโดเมนหรือ blob ของไฟล์ที่เลือก
                                <img
                                    src={theme.logoUrl}
                                    alt="Logo preview"
                                    className="mb-4 h-10 max-w-full object-contain"
                                />
                            ) : (
                                <div
                                    className="mb-4 h-3 w-32 rounded-full"
                                    style={{ backgroundColor: themeColor }}
                                />
                            )}

                            <div className="mb-2 h-3 rounded bg-[#F3F4F6]" />
                            <div className="mb-2 h-3 w-3/4 rounded bg-[#F3F4F6]" />

                            <div
                                className="rounded-xl p-8"
                                style={{ backgroundColor: `${themeColor}20` }}
                            >
                                <div
                                    className="mx-auto h-14 w-14 rounded-b-2xl border-[4px] border-t-0"
                                    style={{ borderColor: themeColor }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        style={{ backgroundColor: themeColor }}
                        className="mt-5 w-full rounded-xl px-4 py-4 text-[16px] font-bold text-white transition hover:opacity-90"
                    >
                        ตัวอย่าง Theme
                    </button>

                    <div className="mt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={saving || uploadingLogo}
                            style={{ backgroundColor: themeColor }}
                            className="flex-1 rounded-full px-4 py-3 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>

                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={saving || uploadingLogo}
                            className="flex-1 rounded-full bg-[#9CA3AF] px-4 py-3 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export { ThemeTab };
