// Import Client
import { apiRequest, apiRequestBlob } from "./http";
// Import Types
import type { DashboardSummary } from "@/src/app/type/api/dashboard";
import type { DeviceListQuery, DeviceListResponse } from "@/src/app/type/api/devices";
import type { MemberListQuery, MemberListResponse } from "@/src/app/type/api/members";
import type { OverviewQuery, OverviewSummary } from "@/src/app/type/api/overview";
import type { PaymentChannelSettingsResponse, PaymentMethodSettingsResponse } from "@/src/app/type/api/payment-settings";
import type { AdminPaymentMethodsResponse, EdcReconciliation, EdcReconciliationQuery, EdcTerminalsResponse, RefundListResponse, RefundStatusFilter } from "@/src/app/type/api/payments";
import type { PricingConfigResponse } from "@/src/app/type/api/pricing";
import type { SystemSettings } from "@/src/app/type/api/system-settings";
import type { Theme } from "@/src/app/type/api/theme";
import type { Transaction, TransactionListQuery, TransactionListResponse } from "@/src/app/type/api/transactions";
// Import Shared
import { seg } from "@/src/app/lib/shared/http";

// ไฟล์นี้รวมการอ่านข้อมูลจาก browser ทั้งหมด เรียก Route Handler ใน app/api ซึ่งเรียก lib/data ต่อไปที่ backend
// (Server Action ทำงานทีละตัวต่อแท็บ Next.js จึงแนะนำให้อ่านข้อมูลผ่าน Route Handler)

/* -------------------------------------- Dashboard / Overview -------------------------------------- */

// Function ดึงสรุป dashboard ของวันนี้
function getDashboard(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard", { errorMessage: "ไม่สามารถดึงข้อมูล Dashboard ได้" });
}

// Function ดึงภาพรวมตามช่วงวันที่ ไม่ส่งวันที่ = ต้นเดือนถึงวันนี้
function getOverview(query: OverviewQuery = {}): Promise<OverviewSummary> {
  return apiRequest<OverviewSummary>("/overview", { query: { ...query }, errorMessage: "ไม่สามารถดึงข้อมูลภาพรวมได้" });
}

/* -------------------------------------- Transactions -------------------------------------- */

// Function ดึงรายการรถเข้าออกพร้อม pagination
function getTransactions(query: TransactionListQuery = {}): Promise<TransactionListResponse> {
  return apiRequest<TransactionListResponse>("/transactions", { query: { ...query }, errorMessage: "ไม่สามารถโหลดข้อมูลได้" });
}

// Function ดึง transaction ล่าสุดของทะเบียนที่ตรงทุกตัว ไม่เจอได้ 404
function getTransactionByPlate(plateNo: string): Promise<Transaction> {
  return apiRequest<Transaction>(`/transactions/${seg(plateNo)}`, { errorMessage: "ไม่สามารถโหลดรายละเอียดรายการได้" });
}

/* -------------------------------------- Payments -------------------------------------- */

// Function ดึงวิธีชำระที่เปิดใช้และอนุญาตในช่องทาง cashier
function getPaymentMethods(): Promise<AdminPaymentMethodsResponse> {
  return apiRequest<AdminPaymentMethodsResponse>("/payments/methods", { errorMessage: "โหลดวิธีชำระเงินไม่สำเร็จ" });
}

// Function ดึงรายการเครื่อง EDC
function getEdcTerminals(): Promise<EdcTerminalsResponse> {
  return apiRequest<EdcTerminalsResponse>("/payments/edc/terminals", { errorMessage: "โหลดรายการเครื่อง EDC ไม่สำเร็จ" });
}

// Function ดึงข้อมูลกระทบยอด EDC
function getEdcReconciliation(query: EdcReconciliationQuery = {}): Promise<EdcReconciliation> {
  return apiRequest<EdcReconciliation>("/payments/edc/reconciliation", { query: { ...query }, errorMessage: "โหลดข้อมูลกระทบยอดไม่สำเร็จ" });
}

// Function ดึงรูป QR ของ charge
function getChargeQrImage(chargeId: string): Promise<Blob> {
  return apiRequestBlob(`/payments/charges/${seg(chargeId)}/qr`, { errorMessage: "โหลดรูป QR ไม่สำเร็จ" });
}

// Function ดึงรายการรอคืนเงินตามสถานะ
function getRefunds(status: RefundStatusFilter = "pending"): Promise<RefundListResponse> {
  return apiRequest<RefundListResponse>("/payments/refunds", { query: { status }, errorMessage: "โหลดรายการรอคืนเงินไม่สำเร็จ" });
}

/* -------------------------------------- Settings -------------------------------------- */

// Function ดึงรายการสมาชิกพร้อม meta ของการ์ดสถิติ
function getMembers(query: MemberListQuery = {}): Promise<MemberListResponse> {
  return apiRequest<MemberListResponse>("/members", { query: { ...query }, errorMessage: "โหลดรายการสมาชิกไม่สำเร็จ" });
}

// Function ดึงรายการอุปกรณ์พร้อมจำนวน online/offline
function getDevices(query: DeviceListQuery = {}): Promise<DeviceListResponse> {
  return apiRequest<DeviceListResponse>("/devices", { query: { ...query }, errorMessage: "โหลดข้อมูลอุปกรณ์ไม่สำเร็จ" });
}

// Function ดึงกฎค่าบริการทั้งหมด
function getPricing(): Promise<PricingConfigResponse> {
  return apiRequest<PricingConfigResponse>("/pricing", { errorMessage: "โหลดข้อมูลค่าบริการไม่สำเร็จ" });
}

// Function ดึงการตั้งค่าวิธีชำระเงิน
function getPaymentMethodSettings(): Promise<PaymentMethodSettingsResponse> {
  return apiRequest<PaymentMethodSettingsResponse>("/payment-settings/methods", { errorMessage: "โหลดวิธีชำระเงินไม่สำเร็จ" });
}

// Function ดึงการตั้งค่าช่องทางบริการ
function getPaymentChannelSettings(): Promise<PaymentChannelSettingsResponse> {
  return apiRequest<PaymentChannelSettingsResponse>("/payment-settings/channels", { errorMessage: "โหลดช่องทางบริการไม่สำเร็จ" });
}

// Function ดึงสีและโลโก้ล่าสุด
function getTheme(): Promise<Theme> {
  return apiRequest<Theme>("/theme", { errorMessage: "โหลดข้อมูลธีมไม่สำเร็จ" });
}

// Function ดึงการตั้งค่าระบบรวมใบเสร็จและ printer
function getSystemSettings(): Promise<SystemSettings> {
  return apiRequest<SystemSettings>("/system-settings", { errorMessage: "โหลดข้อมูลตั้งค่าระบบไม่สำเร็จ" });
}

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลง path /uploads ของ backend เป็น URL ของหน้าเว็บ (Route Handler /uploads ส่งต่อให้) ส่วน URL เต็ม/data/blob คืนตามเดิม
function resolveLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  if (/^(https?:|data:|blob:)/i.test(logoUrl)) return logoUrl;
  return logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`;
}

export { getDashboard, getOverview, getTransactions, getTransactionByPlate, getPaymentMethods, getEdcTerminals, getEdcReconciliation, getChargeQrImage, getRefunds, getMembers, getDevices, getPricing, getPaymentMethodSettings, getPaymentChannelSettings, getTheme, getSystemSettings, resolveLogoUrl };
