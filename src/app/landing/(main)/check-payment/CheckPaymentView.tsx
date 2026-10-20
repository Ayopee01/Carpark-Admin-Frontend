"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { columnFilteringFeature, createColumnHelper, createFilteredRowModel, createPaginatedRowModel, createSortedRowModel, filterFn_includesString, globalFilteringFeature, rowPaginationFeature, rowSortingFeature, tableFeatures, useTable, type ColumnFiltersState, type FilterFn, type PaginationState } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import type { DateRange } from "react-day-picker";
import { LuCarFront, LuSearch } from "react-icons/lu";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
import { TransactionsTable } from "@/src/app/components/check-payment/TransactionsTable";
import { PaymentModal } from "@/src/app/components/check-payment/PaymentModal";
import { DateRangeFilter } from "@/src/app/components/shared/DateRangeFilter";
import { SelectField } from "@/src/app/components/shared/SelectField";
// Import Actions
import { updateTransaction } from "@/src/app/lib/actions/transactions";
// Import Client
import { queryKeys, transactionsQuery } from "@/src/app/lib/client/queries";
import { subscribeTransactionEvents } from "@/src/app/lib/client/events";
import { unwrap } from "@/src/app/lib/client/http";
// Import Types
import type { TransactionListItem, TransactionListQuery } from "@/src/app/type/api/transactions";
import type { TransactionEditDraft, TransactionItem, TransactionStatusFilter } from "@/src/app/type/ui/checkPayment";
// Import Shared
import { getErrorMessage as apiErrorMessage, getFieldErrors } from "@/src/app/lib/shared/http";

/* -------------------------------------- Config -------------------------------------- */

// Config จำนวนแถวต่อหน้าของตาราง
const TABLE_ITEMS_PER_PAGE = 10;

// Config จำนวนปุ่มเลขหน้าที่แสดง
const MAX_VISIBLE_PAGES = 5;

// Config รอหยุดพิมพ์ก่อนค้นหา
const SEARCH_DEBOUNCE_MS = 300;

// Config ระยะโหลดใหม่เมื่อ stream ถูกปฏิเสธ
const POLLING_INTERVAL_MS = 30_000;

// Config ความคืบหน้าที่แสดงระหว่างรอข้อมูลแรก
const LOADING_PROGRESS = 30;

// Config query ของรายการ (ทั้งหมด แล้วกรองและแบ่งหน้าในตาราง)
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

// Function แปลงแถวจาก API เป็นแถวของตาราง
function normalizeTransaction(item: TransactionListItem): TransactionItem {
  const lastPayment = item.latestPayment;

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

// Function เลขหน้าที่แสดงรอบหน้าปัจจุบัน (page เริ่มที่ 1)
function getVisiblePages(page: number, totalPages: number): number[] {
  const startPage = Math.max(1, Math.min(page - 2, totalPages - MAX_VISIBLE_PAGES + 1));
  const endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);
  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
}

/* -------------------------------------- Table -------------------------------------- */

// Config feature ของตาราง: ค้นหาทะเบียน/เลขบิล กรองสถานะและวันที่เข้า เรียงล่าสุดก่อน และแบ่งหน้า
const transactionTableFeatures = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

// Function กรองสถานะตรงตัว
const statusFilter: FilterFn<typeof transactionTableFeatures, TransactionItem> = (row, columnId, filterValue) =>
  row.getValue(columnId) === filterValue;

// Function กรองวันที่เข้าตามช่วงที่เลือก
const entryDateFilter: FilterFn<typeof transactionTableFeatures, TransactionItem> = (row, columnId, filterValue) =>
  isDateInRange(row.getValue<string | null>(columnId), filterValue as DateRange);

// Config คอลัมน์ที่ใช้กรองและเรียง (หน้าตาของแถวอยู่ใน TransactionsTable)
const transactionColumnHelper = createColumnHelper<typeof transactionTableFeatures, TransactionItem>();
const transactionColumns = transactionColumnHelper.columns([
  transactionColumnHelper.accessor("plateNo", {}),
  transactionColumnHelper.accessor("billNo", {}),
  transactionColumnHelper.accessor("status", { filterFn: statusFilter }),
  transactionColumnHelper.accessor("entryAt", { filterFn: entryDateFilter }),
  // เวลาล่าสุดของรายการ (เข้าหรือจ่าย) ใช้เรียงรายการใหม่ก่อน
  transactionColumnHelper.accessor((item) => Math.max(getDateTimeValue(item.entryAt), getDateTimeValue(item.payment.paidAt)), { id: "latestAt" }),
]);

// Config ค้นหาด้วยคำเฉพาะทะเบียนและเลขบิล
const GLOBAL_FILTER_COLUMNS = new Set(["plateNo", "billNo"]);

/* -------------------------------------- Component -------------------------------------- */

// Function หน้าตรวจสอบ รายการรถแบบ realtime ค้นหา แก้ทะเบียน และรับชำระ
function CheckPaymentView(): JSX.Element {
  const queryClient = useQueryClient();
  const [searchPlate, setSearchPlate] = useState("");
  const [debouncedSearchPlate] = useDebounce(searchPlate.trim(), SEARCH_DEBOUNCE_MS);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState<TransactionStatusFilter>("all");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: TABLE_ITEMS_PER_PAGE });

  const [isRealtime, setIsRealtime] = useState(false);
  // stream ถูกปฏิเสธ ให้โหลดผ่าน API เป็นรอบแทน
  const [polling, setPolling] = useState(false);
  // error จากการแก้แถว แสดงเหนือตารางแทนที่จะแทนตาราง
  const [editError, setEditError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransactionEditDraft | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionItem | null>(null);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);

  // รายการมาจาก stream (setQueryData) ทุก snapshot และ update มีรายการทั้งหมด GET ใช้สำรองเท่านั้น
  const { data, isPending, error: loadError } = useQuery({
    ...transactionsQuery(LIST_QUERY),
    enabled: polling,
    refetchInterval: polling ? POLLING_INTERVAL_MS : false,
  });
  const items = useMemo(() => (data?.data ?? []).map(normalizeTransaction), [data]);
  const error = loadError ? apiErrorMessage(loadError, "เกิดข้อผิดพลาด") : "";
  const loading = isPending && !error;

  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      ...(status === "all" ? [] : [{ id: "status", value: status }]),
      ...(dateRange?.from ? [{ id: "entryAt", value: dateRange }] : []),
    ],
    [dateRange, status]
  );

  // ตารางกรอง เรียง และแบ่งหน้า (รายการจาก realtime เปลี่ยนแล้วยังอยู่หน้าเดิม)
  const table = useTable({
    features: transactionTableFeatures,
    columns: transactionColumns,
    data: items,
    getRowId: (item) => item.id,
    state: { columnFilters, globalFilter: debouncedSearchPlate, pagination },
    onPaginationChange: setPagination,
    globalFilterFn: "includesString",
    getColumnCanGlobalFilter: (column) => GLOBAL_FILTER_COLUMNS.has(column.id),
    initialState: { sorting: [{ id: "latestAt", desc: true }] },
    autoResetPageIndex: false,
  });

  const filteredTotal = table.getPrePaginatedRowModel().rows.length;
  const totalPages = Math.max(1, table.getPageCount());
  // หน้าที่แสดงไม่เกินจำนวนหน้าที่มี (รายการลดลงจาก realtime หรือตัวกรอง)
  const page = Math.min(pagination.pageIndex + 1, totalPages);
  const pagedItems = table.getRowModel().rows.map((row) => row.original);
  const pageNumbers = getVisiblePages(page, totalPages);
  const firstItemNumber = filteredTotal === 0 ? 0 : (page - 1) * TABLE_ITEMS_PER_PAGE + 1;
  const lastItemNumber = Math.min(page * TABLE_ITEMS_PER_PAGE, filteredTotal);

  // รายการลดจนหน้าที่เปิดอยู่ไม่มีแล้ว ย้ายไปหน้าสุดท้าย
  useEffect(() => {
    if (pagination.pageIndex > totalPages - 1) table.setPageIndex(totalPages - 1);
  }, [pagination.pageIndex, table, totalPages]);

  function setPage(nextPage: number) {
    table.setPageIndex(nextPage - 1);
  }

  // โหลดรายการใหม่หลังแก้ไข/รับชำระ (ปกติ stream ส่งรายการใหม่มาเองอยู่แล้ว)
  function reloadTransactions(): Promise<void> {
    return queryClient
      .fetchQuery({ ...transactionsQuery(LIST_QUERY), staleTime: 0 })
      .then(() => undefined)
      .catch(() => undefined);
  }

  useEffect(() => {
    const key = queryKeys.transactions(LIST_QUERY);

    const unsubscribe = subscribeTransactionEvents(
      LIST_QUERY,
      {
        onStatusChange: (streamStatus) => setIsRealtime(streamStatus === "open"),
        // สำรองเท่านั้น ไม่ได้ snapshot ตามเวลาให้โหลดผ่าน API ครั้งเดียว
        onNoSnapshot: () => void queryClient.fetchQuery(transactionsQuery(LIST_QUERY)).catch(() => undefined),
        onEvent: (event) => {
          if (
            event.type === "transactions_snapshot" ||
            event.type === "transactions_updated"
          ) {
            queryClient.setQueryData(key, event.data);
          }
        },
        // stream ถูกปฏิเสธ (4xx) ให้โหลดผ่าน API ทุก 30 วินาทีแทน
        onFatalError: () => setPolling(true),
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  function handleChangeSearch(value: string) {
    setSearchPlate(value);
    setPage(1);
  }

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

      await unwrap(updateTransaction(currentPlateNo, { plateNo: nextPlateNo }));

      handleCancelEdit();
      await reloadTransactions();
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
        progress={LOADING_PROGRESS}
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
                  onChange={(event) => handleChangeSearch(event.target.value)}
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

                <SelectField
                  aria-label="สถานะ"
                  value={status}
                  onValueChange={(value) => handleChangeStatus(value as TransactionStatusFilter)}
                  options={[
                    { value: "all", label: "สถานะทั้งหมด" },
                    { value: "pending", label: "ยังไม่จ่าย" },
                    { value: "partially_paid", label: "จ่ายบางส่วน" },
                    { value: "paid_waiting_exit", label: "จ่ายครบ รอรถออก" },
                    { value: "completed", label: "รถออกแล้ว" },
                    { value: "cancelled", label: "ยกเลิก" },
                  ]}
                  className="rounded-full bg-white px-5 py-2 text-[14px] font-semibold text-[#1F2933]"
                />
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
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
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
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
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
        onSuccess={reloadTransactions}
      />
    </>
  );
}

export { CheckPaymentView };
