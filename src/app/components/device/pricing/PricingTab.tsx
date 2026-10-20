"use client";
// Import Library
import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";
// Import Providers
import { useConfirm } from "@/src/app/providers/ConfirmProvider";
// Import Components
import { PricingRuleModal } from "@/src/app/components/device/pricing/PricingRuleModal";
// Import Actions
import { updatePricing } from "@/src/app/lib/actions/pricing";
// Import Client
import { pricingQuery, queryKeys } from "@/src/app/lib/client/queries";
import { unwrap } from "@/src/app/lib/client/http";
// Import Landing
import { EMPTY_PRICING_FORM, MAX_HOUR, VEHICLE_TYPE_OPTIONS, formToPayload, getFeeTypeLabel, getRuleHourEnd, getRuleHourStart, ruleToBody, ruleToForm } from "@/src/app/lib/landing/device";
// Import Types
import type { PricingRuleForm } from "@/src/app/type/ui/device";
import type { FeeType, PricingConfigResponse, PricingRule, PricingRuleBody } from "@/src/app/type/api/pricing";
// Import Shared
import { getErrorMessage, isApiErrorCode } from "@/src/app/lib/shared/http";
import { formatMoney } from "@/src/app/lib/shared/format";

/* -------------------------------------- Config -------------------------------------- */

// Config ค่าเริ่มต้นก่อนโหลดกฎค่าบริการ
const DEFAULT_SERVICE_PRICING_CONFIG: PricingConfigResponse = {
    configUpdatedAt: null,
    pricingRules: [],
};

// Config ลำดับการแสดงของประเภทค่าบริการ
const FEE_TYPE_ORDER: Record<FeeType, number> = {
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
            FEE_TYPE_ORDER[a.feeType] - FEE_TYPE_ORDER[b.feeType] ||
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
    return {
        range: "ทุกครั้งที่ข้ามเที่ยงคืน",
        price: `${formatMoney(rule.price)} บาท/คืน`,
    };
}

/* -------------------------------------- Component -------------------------------------- */

// Function แท็บกฎค่าบริการ บันทึกทั้งชุดผ่าน PUT /pricing
function PricingTab(): JSX.Element {
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const { data, isPending: loading, isError, error: loadError } = useQuery(pricingQuery());
    // true เมื่อกฎชุดปัจจุบันโหลดจาก GET /pricing สำเร็จ (โหลดล่าสุดไม่สำเร็จ = ห้าม PUT และไม่แสดงกฎเก่า)
    const loaded = Boolean(data) && !isError;
    const config = data && !isError ? data : DEFAULT_SERVICE_PRICING_CONFIG;
    const error = loadError ? getErrorMessage(loadError, "เกิดข้อผิดพลาด") : "";

    const [openModal, setOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<PricingRuleForm>(EMPTY_PRICING_FORM);
    // เปลี่ยนทุกครั้งที่เปิด ให้ dialog เริ่มฟอร์มใหม่จาก form
    const [formKey, setFormKey] = useState(0);

    // PUT ได้แค่ configUpdatedAt ใหม่ ต้องโหลดกฎที่บันทึกแล้วมาแสดง
    const updateRules = useMutation({
        mutationFn: (pricingRules: PricingRuleBody[]) =>
            unwrap(updatePricing({ configUpdatedAt: config.configUpdatedAt, pricingRules })),
    });

    // Function โหลดกฎค่าบริการใหม่และรอจนได้ผล
    function reloadPricing() {
        return queryClient.invalidateQueries({ queryKey: queryKeys.pricing });
    }

    const rulesByVehicle = useMemo(() => {
        return VEHICLE_TYPE_OPTIONS.map((vehicle) => ({
            ...vehicle,
            rules: sortRules(
                config.pricingRules.filter((rule) => rule.vehicleType === vehicle.code)
            ),
        }));
    }, [config.pricingRules]);

    function openForm(nextMode: "create" | "edit", nextForm: PricingRuleForm, id: string | null) {
        setModalMode(nextMode);
        setEditingId(id);
        setForm(nextForm);
        setFormKey((value) => value + 1);
        setOpenModal(true);
    }

    function handleOpenCreate(vehicleType: PricingRuleForm["vehicleType"]) {
        openForm("create", { ...EMPTY_PRICING_FORM, vehicleType }, null);
    }

    function handleOpenEdit(rule: PricingRule) {
        openForm("edit", ruleToForm(rule), rule.id);
    }

    // ส่งกฎทั้งชุด (ที่ไม่ส่งจะถูกลบ) พร้อม configUpdatedAt คืน false เมื่อได้ 409 แล้วโหลดใหม่
    async function saveRules(pricingRules: PricingRuleBody[]) {
        // ยังไม่ได้โหลดชุดปัจจุบัน ห้าม PUT เพราะจะลบกฎที่ไม่อยู่บนหน้าจอ
        if (!loaded) {
            throw new Error("ยังโหลดข้อมูลค่าบริการไม่สำเร็จ กรุณาโหลดหน้าใหม่ก่อนแก้ไข");
        }

        try {
            // configUpdatedAt ใหม่มากับ GET ที่โหลดหลังบันทึก ใช้กับ PUT ครั้งถัดไป
            await updateRules.mutateAsync(pricingRules);
            await reloadPricing();
            return true;
        } catch (err) {
            if (isApiErrorCode(err, "PRICING_CONFIG_CONFLICT")) {
                await reloadPricing();
                return false;
            }
            throw err;
        }
    }

    // บันทึกไม่สำเร็จให้ throw ออกไป dialog แสดง error ใต้ช่องและด้านล่างเอง
    async function handleSubmitRule(values: PricingRuleForm) {
        const editedRule = formToPayload(values);
        const currentRules = config.pricingRules;
        const isEdit = modalMode === "edit" && editingId;
        const nextRules: PricingRuleBody[] = isEdit
            ? currentRules.map((rule) =>
                rule.id === editingId ? { ...editedRule, id: rule.id } : ruleToBody(rule)
            )
            : [...currentRules.map(ruleToBody), editedRule];

        if (!(await saveRules(nextRules))) throw new Error(CONFLICT_MESSAGE);
        setOpenModal(false);
    }

    async function handleDeleteRule(id: string) {
        const confirmed = await confirm({
            title: "ลบเงื่อนไขราคา?",
            description: "ต้องการลบเงื่อนไขราคานี้หรือไม่?",
            confirmLabel: "ลบ",
            destructive: true,
        });

        if (!confirmed) return;

        try {
            const nextRules = config.pricingRules
                .filter((rule) => rule.id !== id)
                .map(ruleToBody);

            const saved = await saveRules(nextRules);

            if (!saved) {
                toast.error(CONFLICT_MESSAGE);
            }
        } catch (err) {
            toast.error(getErrorMessage(err, "ลบข้อมูลไม่สำเร็จ"));
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
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenEdit(rule)}
                                                                    className="inline-flex h-9 items-center gap-2 rounded-full border border-[#FF2F2F] px-5 text-[13px] font-bold text-[#FF2F2F]"
                                                                >
                                                                    <LuPencil size={14} />
                                                                    แก้ไข
                                                                </button>

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
                key={formKey}
                open={openModal}
                mode={modalMode}
                defaultValues={form}
                onClose={() => setOpenModal(false)}
                onSubmit={handleSubmitRule}
            />
        </>
    );
}

export { PricingTab };
