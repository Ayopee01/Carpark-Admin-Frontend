"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
import { SystemTabs } from "@/src/app/components/system/SystemTabs";
import { GeneralTab } from "@/src/app/components/system/GeneralTab";
import { EntryBillTab } from "@/src/app/components/system/EntryBillTab";
import { PaidBillTab } from "@/src/app/components/system/PaidBillTab";
// Import Types
import type { SystemMenuKey } from "@/src/app/type/ui/navigation";
// Import Shared
import { formatThaiDateTime } from "@/src/app/lib/shared/format";

/* -------------------------------------- Helpers -------------------------------------- */


// Function ข้อความระหว่างโหลดของแต่ละแท็บ
function getLoadingDetail(activeTab: SystemMenuKey): string {
  switch (activeTab) {
    case "device":
      return "กำลังโหลดการตั้งค่าระบบ";
    case "entry_bill":
      return "กำลังโหลดการตั้งค่าใบ Bill เข้าใช้บริการ";
    case "paid_bill":
      return "กำลังโหลดการตั้งค่าใบ Bill หลังชำระ";
    default:
      return "ระบบลานจอดรถ";
  }
}

/* -------------------------------------- Component -------------------------------------- */

// Function หน้าตั้งค่าระบบ ทั่วไป ใบเสร็จขาเข้า และใบเสร็จชำระเงิน
function SettingSystemPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SystemMenuKey>("device");
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function updateDateTime() {
      setCurrentDateTime(formatThaiDateTime(new Date()));
    }

    updateDateTime();

    const intervalId = window.setInterval(updateDateTime, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        setLoading(true);
        setProgress(8);
      }, 0),
      window.setTimeout(() => setProgress(18), 120),
      window.setTimeout(() => setProgress(60), 260),
      window.setTimeout(() => setProgress(82), 420),
      window.setTimeout(() => setProgress(100), 560),
      window.setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 750),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeTab]);

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case "device":
        return {
          title: "ตั้งค่าระบบ",
          description: "ตั้งค่าการแสดงผลใบเสร็จและอุปกรณ์",
        };

      case "entry_bill":
        return {
          title: "ตั้งค่าใบเสร็จ",
          description:
            "Configure your receipt layout and content for entry and payment phases.",
        };

      case "paid_bill":
        return {
          title: "ตั้งค่าใบเสร็จ",
          description:
            "ตั้งค่ารูปแบบและเนื้อหาใบเสร็จรับเงินของคุณสำหรับขั้นตอนการจอดทะเบียนและการชำระเงิน",
        };

      default:
        return {
          title: "ตั้งค่าระบบ",
          description: "ตั้งค่าการแสดงผลใบเสร็จและอุปกรณ์",
        };
    }
  }, [activeTab]);

  function renderContent() {
    switch (activeTab) {
      case "device":
        return <GeneralTab />;

      case "entry_bill":
        return <EntryBillTab />;

      case "paid_bill":
        return <PaidBillTab />;

      default:
        return <GeneralTab />;
    }
  }

  if (loading) {
    return (
      <LoadingScreen
        open
        progress={progress}
        message="กำลังโหลดข้อมูล..."
        detail={getLoadingDetail(activeTab)}
        fullscreen={false}
      />
    );
  }

  return (
    <section className="min-h-screen bg-[#EFEFEF] px-4 py-6 text-[#1F2933] md:px-8 md:py-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#49C85B] bg-[#F5FFF6] px-4 py-2 text-[13px] font-semibold text-[#38B449]">
            <span className="h-2 w-2 rounded-full bg-[#38B449]" />
            <span>Online</span>
          </div>

          <div className="text-[14px] text-[#808892]">
            {currentDateTime || "-"}
          </div>
        </div>

        <div>
          <h1 className="text-[32px] font-extrabold leading-none text-[#2B3640] sm:text-[42px]">
            {pageTitle.title}
          </h1>

          <p className="mt-2 text-[15px] text-[#67727E]">
            {pageTitle.description}
          </p>
        </div>

        <SystemTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-8 min-w-0 max-w-full">{renderContent()}</div>
      </div>
    </section>
  );
}

export default SettingSystemPage;
