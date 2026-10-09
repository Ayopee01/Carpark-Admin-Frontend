// Import Library
import { redirect } from "next/navigation";

// Function หน้า / ส่งไปหน้า login ให้หน้า login ตัดสินว่าจะไปต่อที่ไหน
function Page(): never {
  redirect("/landing/login");
}

export default Page;
