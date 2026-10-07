"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
// Import Components
import { PricingRuleModal } from "@/src/app/components/device/pricing/PricingRuleModal";
// Import Api
import { getPricing, updatePricing } from "@/src/app/lib/api/pricing";
// Import Landing
import { EMPTY_PRICING_FORM, MAX_HOUR, VEHICLE_TYPE_OPTIONS, formToPayload, getFeeTypeLabel, getRuleHourEnd, getRuleHourStart, isSupportedFeeType, ruleToBody, ruleToForm } from "@/src/app/lib/landing/device";
// Import Types
import type { PricingRuleForm } from "@/src/app/type/ui/device";
import type { PricingConfigResponse, PricingRule, PricingRuleBody } from "@/src/app/type/api/pricing";
// Import Shared
import { getErrorMessage, getFieldErrors, isApiErrorCode } from "@/src/app/lib/shared/http";
import { formatMoney } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config ค่าเริ่มต้นก่อนโหลดกฎค่าบริการ
const DEFAULT_SERVICE_PRICING_CONFIG: PricingConfigResponse = {
    configUpdatedAt: null,
    pricingRules: [],
};

// Config ลำดับการแสดงของประเภทค่าบริการ
const FEE_TYPE_ORDER: Record<string, number> = {
    base_hour: 0,
    next_hour: 1,
    overnight_day: 2,
};

// Config ข้อความเมื่อมีคนบันทึกกฎก่อน (409 PRICING_CONFIG_CONFLICT)
const CONFLICT_MESSAGE =
    "มีผู้อื่นบันทึกค่าบริการไปก่อนหน้านี้ ระบบโหลดข้อมูลล่าสุดให้แล้ว กรุณาตรวจสอบและทำรายการอีกครั้ง";

/* -------------------------------------- Helpers -------------------------------------- */

// Function เรียงกฎตามประเภทรถ ประเภทค่าบริการ และชั่วโมงเริ่ม
function sortRules(rules: PricingRule[]): PricingRule[] {
    return [...rules].sort(
        (a, b) =>
            (FEE_TYPE_ORDER[a.feeType] ?? 9) - (FEE_TYPE_ORDER[b.feeType] ?? 9) ||
            getRuleHourStart(a) - getRuleHourStart(b)
    );
}

// Function สร้างข้อความอธิบายช่วงชั่วโมงของกฎ
function describeRule(rule: PricingRule): { range: string; price: string } {
    if (rule.feeType === "base_hour") {
        return {
            range: `ชั่วโมงที่ 1-${getRuleHourEnd(rule)} ของแต่ละวัน`,
            price: `${formatMoney(rule.price)} บาท/ชม.`,
        };
    }
    if (rule.feeType === "next_hour") {
        return {
            range: `ชั่วโมงที่ ${getRuleHourStart(rule)}-${getRuleHourEnd(rule)} ของแต่ละวัน`,
            price: `${formatMoney(rule.price)} บาท/ชม.`,
        };
    }
    if (rule.feeType === "overnight_day") {
        return {
            range: "ทุกครั้งที่ข้ามเที่ยงคืน",
            price: `${formatMoney(rule.price)} บาท/คืน`,
        };
    }
    return { range: "ประเภทนี้ backend ไม่รองรับแล้ว", price: `${formatMoney(rule.price)} บาท` };
}

/* -------------------------------------- Component -------------------------------------- */

// Function แท็บกฎค่าบริการ บันทึกทั้งชุดผ่าน PUT /pricing
function PricingTab(): JSX.Element {
    const [config, setConfig] = useState<PricingConfigResponse>(
        DEFAULT_SERVICE_PRICING_CONFIG
    );
    const [loading, setLoading] = useState(true);
    // true เมื่อกฎชุดปัจจุบันโหลดจาก GET /pricing แล้ว
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState("");

    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<PricingRuleForm>(EMPTY_PRICING_FORM);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [modalError, setModalError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function fetchConfig(showLoading = true) {
        try {
            if (showLoading) {
                setLoading(true);
            }
            setError("");

            const result = await getPricing();
            const normalizedConfig: PricingConfigResponse = {
                configUpdatedAt: result.configUpdatedAt ?? null,
                pricingRules: result.pricingRules ?? [],
            };

            setConfig(normalizedConfig);
            setLoaded(true);
            return normalizedConfig;
        } catch (err) {
            setError(getErrorMessage(err, "เกิดข้อผิดพลาด"));
            setConfig(DEFAULT_SERVICE_PRICING_CONFIG);
            setLoaded(false);
            return null;
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        void fetchConfig();
    }, []);

    const rulesByVehicle = useMemo(() => {
        return VEHICLE_TYPE_OPTIONS.map((vehicle) => ({
            ...vehicle,
            rules: sortRules(
                (config.pricingRules ?? []).filter((rule) => rule.vehicleType === vehicle.code)
            ),
        }));
    }, [config.pricingRules]);

    function openForm(nextMode: "create" | "edit", nextForm: PricingRuleForm, id: string | null) {
        setModalMode(nextMode);
        setEditingId(id);
        setForm(nextForm);
        setFieldErrors({});
        setModalError("");
        setOpenModal(true);
    }

    function handleOpenCreate(vehicleType: PricingRuleForm["vehicleType"]) {
        openForm("create", { ...EMPTY_PRICING_FORM, vehicleType }, null);
    }

    function handleOpenEdit(rule: PricingRule) {
        openForm("edit", ruleToForm(rule), rule.id);
    }

    function handleChangeForm(patch: Partial<PricingRuleForm>) {
        setForm((prev) => ({ ...prev, ...patch }));
        setFieldErrors((prev) => {
            const next = { ...prev };
            Object.keys(patch).forEach((key) => delete next[key]);
            // error ระดับชุดขึ้นกับประเภท รถ และสถานะด้วย
            if ("feeType" in patch || "vehicleType" in patch || "status" in patch) {
                delete next.feeType;
                delete next.hourStart;
                delete next.hourEnd;
            }
            return next;
        });
        setModalError("");
    }

    // ส่งกฎทั้งชุด (ที่ไม่ส่งจะถูกลบ) พร้อม configUpdatedAt คืน false เมื่อได้ 409 แล้วโหลดใหม่
    async function saveRules(pricingRules: PricingRuleBody[]) {
        // ยังไม่ได้โหลดชุดปัจจุบัน ห้าม PUT เพราะจะลบกฎที่ไม่อยู่บนหน้าจอ
        if (!loaded) {
            throw new Error("ยังโหลดข้อมูลค่าบริการไม่สำเร็จ กรุณาโหลดหน้าใหม่ก่อนแก้ไข");
        }

        try {
            const result = await updatePricing({
                configUpdatedAt: config.configUpdatedAt,
                pricingRules,
            });
            // เก็บ configUpdatedAt ใหม่ไว้ใช้ PUT ครั้งถัดไป แล้วแสดงสิ่งที่บันทึก
            setConfig((prev) => ({ ...prev, configUpdatedAt: result.configUpdatedAt }));
            await fetchConfig(false);
            return true;
        } catch (err) {
            if (isApiErrorCode(err, "PRICING_CONFIG_CONFLICT")) {
                await fetchConfig(false);
                return false;
            }
            throw err;
        }
    }

    async function handleSubmitRule() {
        try {
            setSubmitting(true);
            setModalError("");
            setFieldErrors({});

            const editedRule = formToPayload(form);
            const currentRules = config.pricingRules ?? [];
            const isEdit = modalMode === "edit" && editingId;
            const nextRules: PricingRuleBody[] = isEdit
                ? currentRules.map((rule) =>
                    rule.id === editingId ? { ...editedRule, id: rule.id } : ruleToBody(rule)
                )
                : [...currentRules.map(ruleToBody), editedRule];

            const saved = await saveRules(nextRules);

            if (!saved) {
                setModalError(CONFLICT_MESSAGE);
                return;
            }

            setOpenModal(false);
        } catch (err) {
            // VALIDATION_ERROR แสดงใต้ช่องกรอก ส่วน INVALID_PRICING_RULES ข้อความบอกว่ากฎไหน
            setFieldErrors(getFieldErrors(err));
            setModalError(getErrorMessage(err, "บันทึกข้อมูลไม่สำเร็จ"));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteRule(id: string) {
        const confirmed = window.confirm("ต้องการลบเงื่อนไขราคานี้หรือไม่?");

        if (!confirmed) return;

        try {
            setError("");

            const nextRules = (config.pricingRules ?? [])
                .filter((rule) => rule.id !== id)
                .map(ruleToBody);

            const saved = await saveRules(nextRules);

            if (!saved) {
                setError(CONFLICT_MESSAGE);
            }
        } catch (err) {
            setError(getErrorMessage(err, "ลบข้อมูลไม่สำเร็จ"));
        }
    }

    return (
        <>
            <section>
                <div className="mx-auto max-w-7xl">
                    {error ? (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-12">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <h2 className="border-l-[6px] border-[#061D36] pl-3 text-[24px] font-bold text-[#1F2937] sm:border-l-[8px] sm:pl-4 sm:text-[32px]">
                                กำหนดราคาค่าบริการ
                            </h2>
                        </div>

                        <div className="mb-8 rounded-md border border-[#D0D5DD] bg-[#F9FAFB] px-5 py-4 text-[13px] leading-6 text-[#475467]">
                            <p className="font-semibold text-[#1F2937]">วิธีคิดค่าบริการ</p>
                            <ul className="mt-1 list-disc pl-5">
                                <li>ระบบแบ่งวันที่เวลา 00:00 ตามเวลาไทย</li>
                                <li>แต่ละวันเริ่มนับชั่วโมงที่ 1 ใหม่ เศษชั่วโมงปัดขึ้นเป็นชั่วโมงเต็ม</li>
                                <li>ชั่วโมงที่ไม่มี next_hour ครอบคลุมจะใช้ราคาของ base_hour</li>
                                <li>ค่าค้างคืนคิดทุกครั้งที่ข้ามเที่ยงคืน แต่ถ้าออกตอน 00:00 พอดีไม่คิด</li>
                                <li>ชั่วโมงสูงสุดต่อวันคือ {MAX_HOUR}</li>
                            </ul>
                        </div>

                        {loading ? (
                            <div className="space-y-6">
                                {[1, 2].map((item) => (
                                    <div
                                        key={item}
                                        className="h-[96px] animate-pulse rounded-md border border-[#9CA3AF] bg-white"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {rulesByVehicle.map((group) => (
                                    <div key={group.code}>
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                                            <h3 className="text-[20px] font-bold text-[#1F2937]">
                                                {group.label}
                                            </h3>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenCreate(group.code)}
                                                className="inline-flex h-11 items-center gap-3 rounded-full bg-[#061D36] px-6 text-[14px] font-bold text-white"
                                            >
                                                <LuPlus size={17} />
                                                เพิ่มเงื่อนไข
                                            </button>
                                        </div>

                                        {group.rules.length === 0 ? (
                                            <div className="rounded-md border border-[#9CA3AF] bg-white px-6 py-8 text-center text-[#6B7280]">
                                                ไม่พบข้อมูลค่าบริการ
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {group.rules.map((rule) => {
                                                    const supported = isSupportedFeeType(rule.feeType);
                                                    const text = describeRule(rule);
                                                    const inactive = rule.status !== "active";

                                                    return (
                                                        <article
                                                            key={rule.id}
                                                            className={`flex min-h-[110px] flex-wrap items-center justify-between gap-4 rounded-md border bg-white px-6 py-5 sm:px-8 ${inactive ? "border-[#D0D5DD] opacity-70" : "border-[#061D36]"}`}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="text-[15px] text-[#1F2937]">
                                                                    {getFeeTypeLabel(rule.feeType)} • {text.range}
                                                                    {inactive ? (
                                                                        <span className="ml-2 rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[12px] text-[#667085]">
                                                                            ปิดใช้งาน
                                                                        </span>
                                                                    ) : null}
                                                                </p>

                                                                <p className="mt-2 text-[26px] font-bold text-[#16C75F]">
                                                                    {text.price}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                {supported ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenEdit(rule)}
                                                                        className="inline-flex h-9 items-center gap-2 rounded-full border border-[#FF2F2F] px-5 text-[13px] font-bold text-[#FF2F2F]"
                                                                    >
                                                                        <LuPencil size={14} />
                                                                        แก้ไข
                                                                    </button>
                                                                ) : null}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteRule(rule.id)}
                                                                    className="inline-flex h-9 items-center gap-2 rounded-full border border-[#FF2F2F] px-5 text-[13px] font-bold text-[#FF2F2F]"
                                                                >
                                                                    <LuTrash2 size={14} />
                                                                    ลบ
                                                                </button>
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <PricingRuleModal
                open={openModal}
                mode={modalMode}
                form={form}
                fieldErrors={fieldErrors}
                error={modalError}
                submitting={submitting}
                onClose={() => setOpenModal(false)}
                onChange={handleChangeForm}
                onSubmit={handleSubmitRule}
            />
        </>
    );
}

export { PricingTab };
