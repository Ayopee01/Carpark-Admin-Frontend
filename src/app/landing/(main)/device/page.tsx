"use client";
// Import Library
import { useEffect, useMemo, useState, type JSX } from "react";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";
import { DeviceTabs } from "@/src/app/components/device/DeviceTabs";
import { DevicesTab } from "@/src/app/components/device/devices/DevicesTab";
import { PricingTab } from "@/src/app/components/device/pricing/PricingTab";
import { ChannelsTab } from "@/src/app/components/device/channels/ChannelsTab";
import { ThemeTab } from "@/src/app/components/device/ThemeTab";
// Import Types
import type { SettingMenuKey } from "@/src/app/type/ui/navigation";

/* -------------------------------------- Helpers -------------------------------------- */

// Function แปลงวันเวลาเป็นข้อความไทย
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

// Function ข้อความระหว่างโหลดของแต่ละแท็บ
function getLoadingDetail(activeTab: SettingMenuKey): string {
  switch (activeTab) {
    case "device":
      return "กำลังโหลดการตั้งค่าอุปกรณ์";
    case "pricing":
      return "กำลังโหลดการตั้งราคาค่าบริการ";
    case "channels":
      return "กำลังโหลดช่องทางการชำระเงิน";
    case "theme":
      return "กำลังโหลดการตั้งค่าธีม";
    default:
      return "ระบบลานจอดรถ";
  }
}

/* -------------------------------------- Component -------------------------------------- */

// Function หน้าตั้งค่าอุปกรณ์ แสดงแท็บตาม permission
function DevicePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingMenuKey>("device");
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
          title: "การตั้งค่าอุปกรณ์",
          description: "ตั้งค่าการบริการผ่านตู้ป้อนออกการใช้บริการ",
        };

      case "pricing":
        return {
          title: "การตั้งราคาค่าบริการ",
          description: "ตั้งค่าราคาบริการตามเงื่อนไขเวลาการใช้บริการ",
        };

      case "channels":
        return {
          title: "การตั้งช่องทางชำระเงิน",
          description: "ตั้งค่าช่องทางการชำระเงินที่เปิดให้บริการ",
        };

      case "theme":
        return {
          title: "การตั้งค่าธีม",
          description: "ตั้งค่าธีมการแสดงผลของหน้าจอให้บริการ",
        };

      default:
        return {
          title: "การตั้งค่าอุปกรณ์",
          description: "ตั้งค่าการบริการผ่านตู้ป้อนออกการใช้บริการ",
        };
    }
  }, [activeTab]);

  function renderContent() {
    switch (activeTab) {
      case "device":
        return <DevicesTab />;

      case "pricing":
        return <PricingTab />;

      case "channels":
        return <ChannelsTab />;

      case "theme":
        return <ThemeTab />;

      default:
        return <DevicesTab />;
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

          <div className="text-[13px] text-[#9CA3AF]">
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

        <DeviceTabs activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-8 min-w-0 max-w-full">{renderContent()}</div>
      </div>
    </section>
  );
}

export default DevicePage;
