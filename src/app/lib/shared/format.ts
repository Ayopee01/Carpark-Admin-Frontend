/* -------------------------------------- Config -------------------------------------- */

// Config รูปแบบเงิน ทศนิยม 2 ตำแหน่งเสมอ (backend ปัดเงินเป็น 2 ตำแหน่ง)
const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Config รูปแบบจำนวนนับ มีคั่นหลักพัน
const countFormatter = new Intl.NumberFormat("en-US");

/* -------------------------------------- Functions -------------------------------------- */

// Function แปลงจำนวนเงินเป็นข้อความทศนิยม 2 ตำแหน่ง (ค่าที่ไม่ใช่ตัวเลข = 0)
function formatMoney(value: number | null | undefined): string {
  return moneyFormatter.format(Number.isFinite(value) ? Number(value) : 0);
}

// Function แปลงจำนวนเงินเป็นข้อความพร้อมสัญลักษณ์ ฿
function formatBaht(value: number | null | undefined): string {
  return `฿${formatMoney(value)}`;
}

// Function แปลงจำนวนนับเป็นข้อความคั่นหลักพัน
function formatCount(value: number | null | undefined): string {
  return countFormatter.format(Number.isFinite(value) ? Number(value) : 0);
}

// Function แปลงสตางค์ของ gateway (charge, refund, PENDING_GATEWAY_CHARGE) เป็นบาท
function satangToBaht(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) / 100 : 0;
}

// Function แปลงวันเวลา ISO เป็นวันที่และเวลาแบบไทย dd/mm/yyyy hh:mm (seconds = แสดงวินาที, ไม่มีหรือผิด = -)
function formatDateTime(value: string | null | undefined, options: { seconds?: boolean } = {}): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options.seconds ? { second: "2-digit" } : {}),
    timeZone: "Asia/Bangkok",
  }).format(date);
}

// Function แปลงวันเวลาเป็นข้อความไทยแบบเต็ม ใช้แสดงเวลาที่อัปเดตล่าสุด
function formatThaiDateTime(date: Date): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  })
    .format(date)
    .replace(",", "");
}

// Function แปลงวันที่เป็น YYYY-MM-DD ตามวันในเครื่อง (ไม่มีค่า = "")
function toDateParam(date?: Date): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export { formatMoney, formatBaht, formatCount, satangToBaht, formatDateTime, formatThaiDateTime, toDateParam };
