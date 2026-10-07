"use client";
// Import Library
import type { JSX } from "react";
import { LuCheck, LuPencil, LuWalletCards, LuX } from "react-icons/lu";
// Import Types
import type { TransactionsTableProps, TransactionRowProps, TransactionActionsProps } from "@/src/app/type/ui/checkPayment";
import type { TransactionStatus } from "@/src/app/type/api/transactions";
// Import Shared
import { formatBaht } from "@/src/app/lib/shared/format";

/* -------------------------------------- Status Badge -------------------------------------- */

// Config ข้อความและสีของสถานะ transaction
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "ยังไม่จ่าย",
    className: "border-[#F1C44A] bg-[#FFF8E3] text-[#E2B126]",
  },
  partially_paid: {
    label: "จ่ายบางส่วน",
    className: "border-[#F59E0B] bg-[#FFF7ED] text-[#D97706]",
  },
  paid_waiting_exit: {
    label: "จ่ายครบ รอรถออก",
    className: "border-[#38BDF8] bg-[#EFF6FF] text-[#0284C7]",
  },
  completed: {
    label: "รถออกแล้ว",
    className: "border-[#59D46B] bg-[#EDFFF0] text-[#34B44C]",
  },
  cancelled: {
    label: "ยกเลิก",
    className: "border-[#F87171] bg-[#FEF2F2] text-[#DC2626]",
  },
};

// Function ป้ายสถานะของ transaction
function TransactionStatusBadge({ status }: { status: TransactionStatus }): JSX.Element {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "border-[#D0D5DD] bg-[#F8F9FA] text-[#667085]",
  };

  return (
    <span
      className={`inline-flex min-w-[92px] items-center justify-center rounded-full border px-4 py-1 text-[13px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/* -------------------------------------- Row Actions -------------------------------------- */

// Function ปุ่มชำระเงินและแก้ทะเบียนของแถว
function TransactionActions({
  item,
  isEditing,
  isSaving,
  onPay,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: TransactionActionsProps): JSX.Element {
  const canPay = item.status === "pending" || item.status === "partially_paid";

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => onSaveEdit(item.id)}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-full border border-[#59D46B] px-4 py-2 text-[13px] font-semibold text-[#34B44C] transition hover:bg-[#EDFFF0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LuCheck size={16} />
          {isSaving ? "กำลังบันทึก..." : "บันทึก"}
        </button>

        <button
          type="button"
          onClick={onCancelEdit}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-full border border-[#D0D5DD] px-4 py-2 text-[13px] font-semibold text-[#667085] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LuX size={16} />
          ยกเลิก
        </button>
      </div>
    );
  }

  if (canPay) {
    return (
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => onPay(item.id)}
          className="inline-flex items-center gap-2 rounded-full border border-[#1D2A36] px-4 py-2 text-[13px] font-semibold text-[#1D2A36] transition hover:bg-[#1D2A36] hover:text-white"
        >
          <LuWalletCards size={16} />
          ชำระค่าบริการ
        </button>

        <button
          type="button"
          onClick={() => onStartEdit(item)}
          className="inline-flex items-center gap-2 rounded-full border border-[#F04A3A] px-4 py-2 text-[13px] font-semibold text-[#F04A3A] transition hover:bg-[#FFF1EF]"
        >
          <LuPencil size={16} />
          แก้ไข
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => onStartEdit(item)}
        className="inline-flex items-center gap-2 rounded-full border border-[#F04A3A] px-4 py-2 text-[13px] font-semibold text-[#F04A3A] transition hover:bg-[#FFF1EF]"
      >
        <LuPencil size={16} />
        แก้ไข
      </button>
    </div>
  );
}

/* -------------------------------------- Row -------------------------------------- */

// Function แปลงวันเวลาเป็นข้อความไทย (ไม่มีค่า = -)
function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Function แถวหนึ่งรายการ รองรับการแก้ทะเบียนในแถว
function TransactionRow({
  item,
  isEditing,
  isSaving,
  draft,
  onChangeDraft,
  onPay,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: TransactionRowProps): JSX.Element {
  return (
    <tr className="border-b border-[#E2E5EA] text-[14px] text-[#1F2933]">
      <td className="px-6 py-6">{item.billNo}</td>

      <td className="px-6 py-6">
        {isEditing && draft ? (
          <input
            value={draft.plateNo}
            onChange={(event) => onChangeDraft("plateNo", event.target.value)}
            className="h-10 w-[140px] rounded-md bg-[#ECECEC] px-3 outline-none"
          />
        ) : (
          item.plateNo
        )}
      </td>

      <td className="px-6 py-6">{formatDateTime(item.entryAt)}</td>
      <td className="px-6 py-6">{formatBaht(item.netAmount)}</td>

      <td className="px-6 py-6">
        <TransactionStatusBadge status={item.status} />
        {item.payment.reference ? (
          <div className="mt-1 text-[12px] text-[#67727E]" title="เลขอ้างอิงจากสลิป EDC">
            อ้างอิง EDC: {item.payment.reference}
          </div>
        ) : null}
      </td>

      <td className="px-6 py-6">
        <TransactionActions
          item={item}
          isEditing={isEditing}
          isSaving={isSaving}
          onPay={onPay}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
        />
      </td>
    </tr>
  );
}

/* -------------------------------------- Table -------------------------------------- */

// Function ตารางรายการรถเข้าออกของหน้าตรวจสอบ
function TransactionsTable({
  items,
  editingId,
  savingEditId,
  draft,
  onChangeDraft,
  onPay,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: TransactionsTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full">
        <thead className="border-b border-[#D9DCE2] bg-[#031C36] text-left text-[14px] font-semibold text-white">
          <tr>
            <th className="px-6 py-5">ID - NUMBER</th>
            <th className="px-6 py-5">ทะเบียน</th>
            <th className="px-6 py-5">เวลาที่ใช้บริการ</th>
            <th className="px-6 py-5">ค่าบริการ</th>
            <th className="px-6 py-5">สถานะ</th>
            <th className="px-6 py-5 text-right">ดำเนินการ</th>
          </tr>
        </thead>

        <tbody className="bg-[#F5F5F5]">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-10 text-center text-[15px] text-[#6B7280]"
              >
                ไม่พบข้อมูล
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <TransactionRow
                key={item.id}
                item={item}
                onPay={onPay}
                isEditing={editingId === item.id}
                isSaving={savingEditId === item.id}
                draft={editingId === item.id ? draft : null}
                onChangeDraft={onChangeDraft}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export { TransactionsTable };
