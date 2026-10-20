import "server-only";
// Import Types
import type { AdminPaymentRequest, AdminPaymentResponse, Transaction, TransactionListQuery, TransactionListResponse, TransactionUpdateRequest, TransactionUpdateResponse } from "@/src/app/type/api/transactions";
// Import Server
import { backendJson } from "@/src/app/lib/server/backend";
// Import Shared
import { seg } from "@/src/app/lib/shared/http";

// Function ดึงรายการรถเข้าออกพร้อม pagination (GET /api/transactions)
function getTransactions(query: TransactionListQuery = {}): Promise<TransactionListResponse> {
  return backendJson<TransactionListResponse>("/transactions", { query: { ...query }, errorMessage: "ไม่สามารถโหลดข้อมูลได้" });
}


// Function ดึง transaction ล่าสุดของทะเบียนที่ตรงทุกตัว ไม่เจอได้ 404 (GET /api/transactions/:plateNo)
function getTransactionByPlate(plateNo: string): Promise<Transaction> {
  return backendJson<Transaction>(`/transactions/${seg(plateNo)}`, {
    query: { exact: "true" },
    errorMessage: "ไม่สามารถโหลดรายละเอียดรายการได้",
  });
}

// Function แก้ไข transaction ด้วยทะเบียนเต็ม (PATCH /api/transactions/:plateNo)
function updateTransaction(plateNo: string, body: TransactionUpdateRequest): Promise<TransactionUpdateResponse> {
  return backendJson<TransactionUpdateResponse>(`/transactions/${seg(plateNo)}`, {
    method: "PATCH",
    body,
    errorMessage: "แก้ไขรายการไม่สำเร็จ",
  });
}

// Function รับชำระที่เคาน์เตอร์ เงินสด/บัตร EDC/อื่น ๆ (POST /api/transactions/:plateNo/payment)
function payTransaction(plateNo: string, body: AdminPaymentRequest): Promise<AdminPaymentResponse> {
  return backendJson<AdminPaymentResponse>(`/transactions/${seg(plateNo)}/payment`, {
    method: "POST",
    body,
    errorMessage: "ไม่สามารถยืนยันการชำระเงินได้",
  });
}

export { getTransactions, getTransactionByPlate, updateTransaction, payTransaction };
