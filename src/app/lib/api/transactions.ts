// Import Types
import type { AdminPaymentRequest, AdminPaymentResponse, Transaction, TransactionListQuery, TransactionListResponse, TransactionUpdateRequest, TransactionUpdateResponse, TransactionsStreamEvent } from "@/src/app/type/api/transactions";
import type { SseOptions } from "@/src/app/type/api/common";
// Import Shared
import { apiRequest, seg, subscribeSse } from "@/src/app/lib/shared/http";

// Function ดึงรายการรถเข้าออกพร้อม pagination (GET /api/transactions)
function getTransactions(query: TransactionListQuery = {}): Promise<TransactionListResponse> {
  return apiRequest<TransactionListResponse>("/transactions", { query: { ...query }, errorMessage: "ไม่สามารถโหลดข้อมูลได้" });
}

// Function เปิด SSE รับรายการใหม่ตาม query เดียวกับ list (GET /api/transactions/events)
function subscribeTransactionEvents(query: TransactionListQuery, options: SseOptions<TransactionsStreamEvent>): () => void {
  return subscribeSse("/transactions/events", { ...options, query: { ...query } });
}

// Function ดึง transaction ล่าสุดของทะเบียนที่ตรงทุกตัว ไม่เจอได้ 404 (GET /api/transactions/:plateNo)
function getTransactionByPlate(plateNo: string): Promise<Transaction> {
  return apiRequest<Transaction>(`/transactions/${seg(plateNo)}`, {
    query: { exact: "true" },
    errorMessage: "ไม่สามารถโหลดรายละเอียดรายการได้",
  });
}

// Function แก้ไข transaction ด้วยทะเบียนเต็ม (PATCH /api/transactions/:plateNo)
function updateTransaction(plateNo: string, body: TransactionUpdateRequest): Promise<TransactionUpdateResponse> {
  return apiRequest<TransactionUpdateResponse>(`/transactions/${seg(plateNo)}`, {
    method: "PATCH",
    body,
    errorMessage: "แก้ไขรายการไม่สำเร็จ",
  });
}

// Function รับชำระที่เคาน์เตอร์ เงินสด/บัตร EDC/อื่น ๆ (POST /api/transactions/:plateNo/payment)
function payTransaction(plateNo: string, body: AdminPaymentRequest): Promise<AdminPaymentResponse> {
  return apiRequest<AdminPaymentResponse>(`/transactions/${seg(plateNo)}/payment`, {
    method: "POST",
    body,
    errorMessage: "ไม่สามารถยืนยันการชำระเงินได้",
  });
}

export { getTransactions, subscribeTransactionEvents, getTransactionByPlate, updateTransaction, payTransaction };
