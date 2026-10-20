// Import Library
import type { JSX } from "react";
// Import Components
import { LoadingScreen } from "@/src/app/components/shared/LoadingScreen";

// Function หน้าโหลดระหว่างเปลี่ยนหน้าใน /landing
function Loading(): JSX.Element {
    return (
        <LoadingScreen
            open
            progress={72}
            message="กำลังโหลดข้อมูล..."
            detail="ระบบลานจอดรถ"
            fullscreen={false}
        />
    );
}

export default Loading;
