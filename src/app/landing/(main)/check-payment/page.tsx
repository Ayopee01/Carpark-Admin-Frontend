"use client";
// Import Library
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { DateRange } from "react-day-picker";
import { LuCarFront, LuChevronDown, LuSearch } from "react-icons/lu";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
import { TransactionsTable } from "@/src/app/components/check-payment/TransactionsTable";
import { PaymentModal } from "@/src/app/components/check-payment/PaymentModal";
import { DateRangeFilter } from "@/src/app/components/shared/DateRangeFilter";
// Import Api
import { getTransactions, subscribeTransactionEvents, updateTransaction } from "@/src/app/lib/api/transactions";
// Import Types
import type { TransactionListItem, TransactionListQuery, TransactionLatestPayment } from "@/src/app/type/api/transactions";
import type { TransactionEditDraft, TransactionItem, TransactionStatusFilter } from "@/src/app/type/ui/checkPayment";
// Import Shared
import { getErrorMessage as apiErrorMessage, getFieldErrors } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config จำนวนแถวต่อหน้าของตาราง
const TABLE_ITEMS_PER_PAGE = 10;


// Config query ของรายการ (ทั้งหมด แล้วกรองและแบ่งหน้าในหน้านี้)
const LIST_QUERY: TransactionListQuery = { all: "true" };

/* -------------------------------------- Helpers -------------------------------------- */

// Function ตัดเวลาออกจากวันที่
function normalizeDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Function ตรวจว่าวันที่อยู่ในช่วงที่เลือก
function isDateInRange(value: string | null | undefined, range?: DateRange): boolean {
  if (!range?.from) return true;
  if (!value) return false;

  const targetDate = new Date(value);

  if (Number.isNaN(targetDate.getTime())) {
    return false;
  }

  const target = normalizeDateOnly(targetDate).getTime();
  const from = normalizeDateOnly(range.from).getTime();
  const to = normalizeDateOnly(range.to ?? range.from).getTime();

  return target >= from && target <= to;
}

// Function แปลงวันเวลาเป็น timestamp สำหรับเรียงลำดับ (ไม่มี = 0)
function getDateTimeValue(value: string | null | undefined): number {
  if (!value) return 0;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

// Function ดึงการชำระล่าสุดของรายการ
function getLastPayment(item: TransactionListItem): TransactionLatestPayment | null {
  return item.latestPayment;
}

// Function แปลงแถวจาก API เป็นแถวของตาราง
function normalizeTransaction(item: TransactionListItem): TransactionItem {
  const lastPayment = getLastPayment(item);

  return {
    id: item.id,
    billNo: item.billNo,
    plateNo: item.plateNo,
    vehicleType: item.vehicleType,
    entryAt: item.entryAt,
    exitAt: item.exitAt,
    netAmount: item.amount.net,
    status: item.status,
    payment: {
      method: lastPayment?.method ?? null,
      paidAt: lastPayment?.paidAt ?? null,
      reference: lastPayment?.reference ?? null,
    },
  };
}

/* -------------------------------------- Component -------------------------------------- */

// Function หน้าตรวจสอบ รายการรถแบบ realtime ค้นหา แก้ทะเบียน และรับชำระ
function CheckPaymentPage(): JSX.Element {
  const [searchPlate, setSearchPlate] = useState("");
  const [debouncedSearchPlate, setDebouncedSearchPlate] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [status, setStatus] = useState<TransactionStatusFilter>("all");
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [requestedPage, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(30);
  const [error, setError] = useState("");
  const [isRealtime, setIsRealtime] = useState(false);
  // error จากการแก้แถว แสดงเหนือตารางแทนที่จะแทนตาราง
  const [editError, setEditError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransactionEditDraft | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionItem | null>(null);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);

  const loadingTimerRef = useRef<number | null>(null);

  const filteredItems = useMemo(() => {
    const keyword = debouncedSearchPlate.trim().toLowerCase();

    return items
      .filter((item) => {
        const plateNo = item.plateNo;
        const billNo = item.billNo;
        const matchKeyword = keyword
          ? plateNo.toLowerCase().includes(keyword) ||
          billNo.toLowerCase().includes(keyword)
          : true;

        const matchStatus = status === "all" ? true : item.status === status;
        const matchDate = isDateInRange(item.entryAt, dateRange);

        return matchKeyword && matchStatus && matchDate;
      })
      .sort((a, b) => {
        const latestA = Math.max(
          getDateTimeValue(a.entryAt),
          getDateTimeValue(a.payment.paidAt)
        );
        const latestB = Math.max(
          getDateTimeValue(b.entryAt),
          getDateTimeValue(b.payment.paidAt)
        );

        return latestB - latestA;
      });
  }, [items, debouncedSearchPlate, status, dateRange]);

  const filteredTotal = filteredItems.length;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredTotal / TABLE_ITEMS_PER_PAGE));
  }, [filteredTotal]);

  // หน้าที่แสดงไม่เกินจำนวนหน้าที่มี (รายการลดลงจาก realtime หรือตัวกรอง)
  const page = Math.min(requestedPage, totalPages);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * TABLE_ITEMS_PER_PAGE;
    const end = start + TABLE_ITEMS_PER_PAGE;

    return filteredItems.slice(start, end);
  }, [filteredItems, page]);

  const pageNumbers = useMemo(() => {
    const maxVisiblePages = 5;
    const startPage = Math.max(
      1,
      Math.min(page - 2, totalPages - maxVisiblePages + 1)
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  }, [page, totalPages]);

  const firstItemNumber =
    filteredTotal === 0 ? 0 : (page - 1) * TABLE_ITEMS_PER_PAGE + 1;

  const lastItemNumber = Math.min(
    page * TABLE_ITEMS_PER_PAGE,
    filteredTotal
  );

  function finishLoadingAfterDelay() {
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current);
    }

    loadingTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      setProgress(0);
      loadingTimerRef.current = null;
    }, 350);
  }

  async function fetchTransactions(showLoading = false): Promise<void> {
    try {
      if (showLoading) {
        setLoading(true);
        setProgress(8);
      }

      setError("");

      if (showLoading) {
        setProgress(18);
      }

      const raw = await getTransactions(LIST_QUERY);

      if (showLoading) {
        setProgress(82);
      }

      const normalizedItems = raw.data.map(normalizeTransaction);

      setItems(normalizedItems);
      if (showLoading) {
        setProgress(100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      if (showLoading) {
        setProgress(100);
      }
    } finally {
      if (showLoading) {
        finishLoadingAfterDelay();
      }
    }
  }

  // รายการมาจาก stream ทุก snapshot และ update มีรายการทั้งหมด จึงไม่ต้องเรียก API
  useEffect(() => {
    let pollingTimer: number | undefined;
    let receivedSnapshot = false;

    const unsubscribe = subscribeTransactionEvents(
      LIST_QUERY,
      {
        onStatusChange: (streamStatus) => setIsRealtime(streamStatus === "open"),
        // สำรองเท่านั้น ไม่ได้ snapshot ตามเวลาให้โหลดผ่าน API ครั้งเดียว
        onNoSnapshot: () => void fetchTransactions(true),
        onEvent: (event) => {
          if (
            event.type === "transactions_snapshot" ||
            event.type === "transactions_updated"
          ) {
            setItems(event.data.data.map(normalizeTransaction));
            setError("");
            if (!receivedSnapshot) {
              receivedSnapshot = true;
              setProgress(100);
              finishLoadingAfterDelay();
            }
          }
        },
        // stream ถูกปฏิเสธ (4xx) ให้โหลดผ่าน API แทน
        onFatalError: () => {
          receivedSnapshot = true;
          void fetchTransactions(true);
          pollingTimer = window.setInterval(() => {
            void fetchTransactions(false);
          }, 30000);
        },
      }
    );

    return () => {
      unsubscribe();
      window.clearInterval(pollingTimer);
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once on mount
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchPlate(searchPlate.trim());
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchPlate]);

  function handleChangeStatus(nextStatus: TransactionStatusFilter) {
    setStatus(nextStatus);
    setPage(1);
  }

  function handleChangeDateRange(nextRange: DateRange | undefined) {
    setDateRange(nextRange);
    setPage(1);
  }

  function handleStartEdit(item: TransactionItem) {
    setEditingId(item.id);
    setDraft({
      plateNo: item.plateNo,
    });
  }

  function handleCancelEdit() {
    setEditError("");
    setEditingId(null);
    setDraft(null);
  }

  function handleChangeDraft(field: keyof TransactionEditDraft, value: string) {
    setDraft((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [field]: value,
      };
    });
  }

  async function handleSaveEdit(id: string) {
    const nextPlateNo = draft?.plateNo.trim();
    // PATCH /transactions/:plateNo ใช้ทะเบียนเต็มปัจจุบัน ไม่ใช่ id
    const currentPlateNo = items.find((item) => item.id === id)?.plateNo;

    if (!nextPlateNo) {
      setEditError("กรุณากรอกเลขทะเบียน");
      return;
    }

    if (!currentPlateNo) {
      setEditError("ไม่พบรายการนี้แล้ว กรุณาโหลดข้อมูลใหม่");
      return;
    }

    try {
      setSavingEditId(id);
      setEditError("");

      await updateTransaction(currentPlateNo, { plateNo: nextPlateNo });

      handleCancelEdit();
      await fetchTransactions(false);
    } catch (err) {
      // VALIDATION_ERROR แสดงข้อความของ plateNo ส่วน error อื่นมีข้อความไทยจาก toApiError
      const plateError = getFieldErrors(err).plateNo;
      setEditError(plateError ? `เลขทะเบียน: ${plateError}` : apiErrorMessage(err, "เกิดข้อผิดพลาด"));
    } finally {
      setSavingEditId(null);
    }
  }

  function handleOpenPayment(id: string) {
    setSelectedTransaction(items.find((item) => item.id === id) ?? null);
    setSelectedId(id);
    setOpenPaymentModal(true);
  }

  function handleClosePayment() {
    setOpenPaymentModal(false);
    setSelectedId(null);
    setSelectedTransaction(null);
  }

  if (loading) {
    return (
      <LoadingScreen
        open
        progress={progress}
        message="กำลังโหลดข้อมูล..."
        detail="ตรวจสอบและชำระเงิน"
        fullscreen={false}
      />
    );
  }

  return (
    <>
      <section className="min-h-screen bg-[#EFEFEF] px-4 py-6 text-[#1F2933] md:px-8 md:py-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-extrabold leading-none text-[#2B3640] sm:text-[34px]">
                ตรวจสอบและชำระเงิน
              </h1>
              <p className="mt-3 text-[15px] text-[#67727E]">• แอดมินบริการ</p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#49C85B] bg-[#F5FFF6] px-4 py-2 text-[13px] font-semibold text-[#38B449]">
              <span className="h-2 w-2 rounded-full bg-[#38B449]" />
              <span>{isRealtime ? "Realtime" : "Online"}</span>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#D8DADF] bg-[#F2F2F2] p-4 shadow-sm sm:p-6">
            <div className="text-center text-[18px] font-extrabold text-[#111827] sm:text-[20px]">
              ค้นหาด้วยเลขทะเบียน
            </div>

            <div className="mt-5 grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative flex h-12 items-center rounded-full border border-gray-300 bg-[#F4F4F4] px-4 sm:px-6">
                <LuCarFront size={22} className="shrink-0 text-[#8D99A8]" />

                <input
                  value={searchPlate}
                  onChange={(event) => setSearchPlate(event.target.value)}
                  placeholder="กรอกเลขทะเบียน"
                  className="ml-3 min-w-0 w-full bg-transparent pr-9 text-[16px] text-[#1F2933] outline-none placeholder:text-[#9AA3AF] sm:ml-4 sm:pr-10"
                />

                <LuSearch
                  size={20}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8D99A8] sm:right-6"
                />
              </div>

              <DateRangeFilter
                value={dateRange}
                onChange={handleChangeDateRange}
              />
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[20px] border border-[#BAC0C8] bg-white shadow-sm">
            <div className="bg-[#031C36] px-6 py-5 text-white">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[18px] font-extrabold">ผลการค้นหา</h2>
                  <span className="text-[13px] text-white/80">
                    แสดง {firstItemNumber}-{lastItemNumber} จากทั้งหมด{" "}
                    {filteredTotal} รายการ
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={status}
                    onChange={(event) =>
                      handleChangeStatus(
                        event.target.value as TransactionStatusFilter
                      )
                    }
                    className="appearance-none rounded-full bg-white px-5 py-2 pr-10 text-[14px] font-semibold text-[#1F2933] outline-none"
                  >
                    <option value="all">สถานะทั้งหมด</option>
                    <option value="pending">ยังไม่จ่าย</option>
                    <option value="partially_paid">จ่ายบางส่วน</option>
                    <option value="paid_waiting_exit">จ่ายครบ รอรถออก</option>
                    <option value="completed">รถออกแล้ว</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>

                  <LuChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#1F2933]"
                  />
                </div>
              </div>
            </div>

            {editError && !error ? (
              <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-[14px] text-red-600">
                {editError}
              </div>
            ) : null}

            {error ? (
              <div className="px-6 py-10 text-[15px] text-red-600">{error}</div>
            ) : (
              <TransactionsTable
                items={pagedItems}
                editingId={editingId}
                savingEditId={savingEditId}
                draft={draft}
                onChangeDraft={handleChangeDraft}
                onPay={handleOpenPayment}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
              />
            )}
          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-[20px] border border-[#D8DADF] bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium text-[#6B7280]">
              ทั้งหมด {filteredTotal} รายการ
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(page - 1, 1))}
                disabled={page === 1}
                className="h-10 rounded-full border border-[#D8DADF] bg-white px-4 text-sm font-semibold text-[#1F2933] transition hover:bg-[#F4F4F4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ก่อนหน้า
              </button>

              {page > 3 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="h-10 min-w-10 rounded-full border border-[#D8DADF] bg-white px-4 text-sm font-semibold text-[#1F2933] transition hover:bg-[#F4F4F4]"
                  >
                    1
                  </button>
                  <span className="px-1 text-sm text-[#6B7280]">...</span>
                </>
              ) : null}

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`h-10 min-w-10 rounded-full px-4 text-sm font-semibold transition ${page === pageNumber
                      ? "bg-[#061D36] text-white"
                      : "border border-[#D8DADF] bg-white text-[#1F2933] hover:bg-[#F4F4F4]"
                    }`}
                >
                  {pageNumber}
                </button>
              ))}

              {page < totalPages - 2 ? (
                <>
                  <span className="px-1 text-sm text-[#6B7280]">...</span>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="h-10 min-w-10 rounded-full border border-[#D8DADF] bg-white px-4 text-sm font-semibold text-[#1F2933] transition hover:bg-[#F4F4F4]"
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  setPage(Math.min(page + 1, totalPages))
                }
                disabled={page === totalPages}
                className="h-10 rounded-full border border-[#D8DADF] bg-white px-4 text-sm font-semibold text-[#1F2933] transition hover:bg-[#F4F4F4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </section>

      <PaymentModal
        open={openPaymentModal}
        transactionId={selectedId}
        transaction={selectedTransaction}
        onClose={handleClosePayment}
        onSuccess={() => fetchTransactions(false)}
      />
    </>
  );
}

export default CheckPaymentPage;
