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

export { formatMoney, formatBaht, formatCount, satangToBaht };
