"use server";
// Import Data
import * as paymentsData from "@/src/app/lib/data/payments";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { CreateChargeRequest, CreateChargeResponse, PaymentSocketConnection, ResolveRefundRequest, ResolveRefundResponse, VerifyChargeResponse } from "@/src/app/type/api/payments";

// Server Action สร้าง QR PromptPay
async function createCharge(body: CreateChargeRequest): Promise<ActionResult<CreateChargeResponse>> {
  return runAction(() => paymentsData.createCharge(body));
}

// Server Action ขอให้ backend ตรวจสถานะ charge กับ Omise อีกครั้ง
async function verifyCharge(chargeId: string): Promise<ActionResult<VerifyChargeResponse>> {
  return runAction(() => paymentsData.verifyCharge(chargeId));
}

// Server Action บันทึกว่าคืนเงินให้ลูกค้าแล้ว
async function resolveRefund(chargeId: string, body: ResolveRefundRequest = {}): Promise<ActionResult<ResolveRefundResponse>> {
  return runAction(() => paymentsData.resolveRefund(chargeId, body));
}

// Server Action ขอ ticket ต่อ WebSocket สถานะชำระเงิน พร้อม URL ของ WebSocket (PAYMENT_WS_URL อ่านตอน runtime ไม่ต้อง build ใหม่)
async function createPaymentSocketTicket(chargeId: string): Promise<ActionResult<PaymentSocketConnection>> {
  return runAction(async () => {
    const ticket = await paymentsData.createPaymentSocketTicket(chargeId);
    return { ...ticket, url: process.env.PAYMENT_WS_URL?.trim() || null };
  });
}

export { createCharge, verifyCharge, resolveRefund, createPaymentSocketTicket };
