"use server";
// Import Data
import * as transactionsData from "@/src/app/lib/data/transactions";
// Import Server
import { runAction } from "@/src/app/lib/server/action";
// Import Types
import type { ActionResult } from "@/src/app/type/api/common";
import type { AdminPaymentRequest, AdminPaymentResponse, TransactionUpdateRequest, TransactionUpdateResponse } from "@/src/app/type/api/transactions";

// Server Action แก้ไข transaction ด้วยทะเบียนเต็ม
async function updateTransaction(plateNo: string, body: TransactionUpdateRequest): Promise<ActionResult<TransactionUpdateResponse>> {
  return runAction(() => transactionsData.updateTransaction(plateNo, body));
}

// Server Action รับชำระที่เคาน์เตอร์ เงินสด/บัตร EDC/อื่น ๆ
async function payTransaction(plateNo: string, body: AdminPaymentRequest): Promise<ActionResult<AdminPaymentResponse>> {
  return runAction(() => transactionsData.payTransaction(plateNo, body));
}

export { updateTransaction, payTransaction };
