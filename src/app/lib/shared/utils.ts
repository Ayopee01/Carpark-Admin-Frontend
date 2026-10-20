// Import Library
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Function รวม className ของ Tailwind และตัด class ที่ชนกันออก
function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export { cn };
