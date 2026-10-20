// Import Library
import { io, type Socket } from "socket.io-client";
// Import Actions
import { getRealtimeConnection } from "@/src/app/lib/actions/realtime";
// Import Client
import { unwrap } from "./http";
import { handleSessionRevoked } from "./session";
// Import Types
import type { AdminStream, RealtimeConnectErrorData, SessionRevokedEvent, SocketAck, StreamForbiddenEvent, StreamOptions, StreamStatus } from "@/src/app/type/api/realtime";
// Import Shared
import { ApiError, toApiError, RECONNECT_DELAYS_MS } from "@/src/app/lib/shared/http";

// ไฟล์นี้ดูแล Socket.IO namespace /admin เส้นเดียวต่อแท็บที่ทุก stream ใช้ร่วมกัน (ต่อตรงไป backend ไม่ผ่าน Route Handler)
// - token ขอจาก Server Action ทุกครั้งที่ต่อ (proxy.ts refresh ให้) Socket.IO จัดการ heartbeat และ reconnect เอง
// - subscription ผูกกับ connection: ต่อใหม่ทุกครั้ง subscribe ทุก stream ใหม่ และได้ snapshot ใหม่ทาง ack
// - stream เดียวกัน subscribe ได้ทีละชุดต่อ connection ตัวที่ subscribe ทีหลังแทนตัวเดิม

/* -------------------------------------- Config -------------------------------------- */

// Config namespace ของ Admin
const ADMIN_NAMESPACE = "/admin";

// Config รอ ack ของ <stream>:subscribe ก่อนลองใหม่
const ACK_TIMEOUT_MS = 10_000;

// Config รอข้อมูลแรกจาก stream ก่อนเรียก onNoSnapshot ให้หน้าโหลดผ่าน API แทน
const FIRST_SNAPSHOT_TIMEOUT_MS = 8000;

// Config status ของ error ใน ack (ack ไม่มี status เหมือน HTTP)
const ACK_ERROR_STATUS: Record<string, number> = { FORBIDDEN: 403, UNAUTHORIZED: 401, INVALID_TOKEN: 401, INVALID_SESSION: 401 };

/* -------------------------------------- Types -------------------------------------- */

// Type stream ที่ subscribe อยู่บน socket
type ActiveStream = {
  subscribe: () => void; // emit <stream>:subscribe (เรียกตอนต่อได้ทุกครั้ง)
  setStatus: (status: StreamStatus) => void;
  forbid: () => void; // สิทธิ์ถูกถอดระหว่างเชื่อมต่อ
  replace: () => void; // มีตัวใหม่ subscribe stream เดียวกัน
};

// Type วิธีแปลง event ของ Socket.IO เป็น event ของหน้า
type StreamDefinition<TSnapshot, TEvent> = {
  stream: AdminStream;
  payload?: object;
  toSnapshot: (data: TSnapshot) => TEvent | null; // ผลจาก ack (null = ไม่มีข้อมูลแรก)
  events: Record<string, (payload: never) => TEvent>; // ชื่อ event ของ socket → event ของหน้า
};

/* -------------------------------------- State -------------------------------------- */

// socket ของแท็บนี้ (สร้างเมื่อมีการ subscribe ครั้งแรก)
let socketPromise: Promise<Socket> | null = null;
// stream ที่ subscribe อยู่ แยกตามชื่อ stream
const activeStreams = new Map<AdminStream, ActiveStream>();
// ขอ token ใหม่แล้วต่อใหม่ได้ครั้งเดียวต่อการถูกปฏิเสธ invalid_token ถูกปฏิเสธติดกัน 2 ครั้งจึงจบ session
let tokenRetried = false;
// ขอ token จาก Server Action ไม่สำเร็จ (เน็ต/server ของหน้าเว็บ) invalid_token ครั้งนี้ไม่ใช่ปัญหาของ session
let tokenUnavailable = false;
// รอบของการต่อใหม่ที่ทำเอง (server ปฏิเสธแล้ว Socket.IO ไม่ต่อใหม่ให้)
let retryAttempt = 0;
let retryTimer: number | undefined;

/* -------------------------------------- Helpers -------------------------------------- */

// Function ส่ง status ให้ทุก stream
function broadcastStatus(status: StreamStatus): void {
  activeStreams.forEach((entry) => entry.setStatus(status));
}

// Function ต่อใหม่ภายหลัง (delay ไม่ระบุ = ตามรอบ 1, 2, 5, 10 แล้วทุก 30 วินาที)
function scheduleReconnect(socket: Socket, delay?: number): void {
  window.clearTimeout(retryTimer);
  const wait = delay ?? RECONNECT_DELAYS_MS[Math.min(retryAttempt, RECONNECT_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  broadcastStatus("reconnecting");
  retryTimer = window.setTimeout(() => socket.connect(), wait);
}

// Function จัดการ connect_error ที่ server ปฏิเสธ (error ของ network Socket.IO ต่อใหม่ให้เอง)
function handleConnectError(socket: Socket, error: Error): void {
  if (socket.active) {
    broadcastStatus("reconnecting");
    return;
  }

  const data = (error as Error & { data?: RealtimeConnectErrorData }).data;
  if (data?.statusCode === 401) {
    if (data.reason === "invalid_token" && tokenUnavailable) {
      scheduleReconnect(socket);
      return;
    }
    // token หมดอายุพอดี ขอ token ใหม่ (proxy.ts refresh ให้) แล้วต่อใหม่ครั้งเดียว
    if (data.reason === "invalid_token" && !tokenRetried) {
      tokenRetried = true;
      socket.connect();
      return;
    }
    handleSessionRevoked(data.reason === "invalid_token" ? undefined : data.reason);
    return;
  }

  const retryAfter = Number(data?.details?.retryAfter);
  scheduleReconnect(socket, data?.statusCode === 429 && retryAfter > 0 ? retryAfter * 1000 : undefined);
}

// Function สร้าง socket ของ /admin และผูก event ของ connection ทันที (ก่อนต่อเสร็จ)
function createSocket(connection: { url: string | null; token: string }): Socket {
  // token จากการขอครั้งแรกใช้กับการต่อครั้งแรก ครั้งต่อไปขอใหม่ทุกครั้ง
  let initialToken: string | null = connection.token;

  const socket = io(`${connection.url ?? window.location.origin}${ADMIN_NAMESPACE}`, {
    auth: (callback) => {
      if (initialToken) {
        const token = initialToken;
        initialToken = null;
        callback({ token });
        return;
      }
      unwrap(getRealtimeConnection())
        .then(({ token }) => {
          tokenUnavailable = false;
          callback({ token });
        })
        .catch(() => {
          // 401 unwrap พาไปหน้า login แล้ว อื่น ๆ ให้ connect_error ตัดสินใจต่อใหม่
          tokenUnavailable = true;
          callback({ token: "" });
        });
    },
  });

  socket.on("connect", () => {
    tokenRetried = false;
    retryAttempt = 0;
    window.clearTimeout(retryTimer);
    activeStreams.forEach((entry) => entry.subscribe());
  });

  socket.on("connect_error", (error) => handleConnectError(socket, error));

  socket.on("disconnect", (reason) => {
    // server ตัดเองใช้กับ session จบเท่านั้น (session:revoked มาก่อน) Socket.IO ไม่ต่อใหม่ให้
    if (reason === "io server disconnect") {
      broadcastStatus("closed");
      handleSessionRevoked();
      return;
    }
    broadcastStatus("reconnecting");
  });

  socket.on("session:revoked", (event: SessionRevokedEvent) => handleSessionRevoked(event.reason));

  socket.on("stream:forbidden", (event: StreamForbiddenEvent) => activeStreams.get(event.stream)?.forbid());

  return socket;
}

// Function ดึง socket ของแท็บ สร้างเมื่อเรียกครั้งแรก (ขอ URL และ token ไม่สำเร็จ = ลองใหม่ครั้งถัดไป)
function getSocket(): Promise<Socket> {
  socketPromise ??= unwrap(getRealtimeConnection())
    .then(createSocket)
    .catch((error: unknown) => {
      socketPromise = null;
      throw error;
    });
  return socketPromise;
}

// Function แปลง error ใน ack เป็น ApiError แบบเดียวกับ HTTP
function toAckError(error: Extract<SocketAck, { ok: false }>["error"]): ApiError {
  const code = error.code ?? "BAD_REQUEST";
  return toApiError(ACK_ERROR_STATUS[code] ?? 400, { ...error.details, code, message: error.message }, "เชื่อมต่อข้อมูลแบบ realtime ไม่สำเร็จ");
}

/* -------------------------------------- Functions -------------------------------------- */

// Function subscribe stream ของ /admin: ได้ snapshot จาก ack ทุกครั้งที่ต่อ แล้วได้ event ตามที่กำหนด คืน function เลิก subscribe
function subscribeStream<TSnapshot, TEvent>(definition: StreamDefinition<TSnapshot, TEvent>, options: StreamOptions<TEvent>): () => void {
  const { stream, payload } = definition;
  let closed = false;
  let socket: Socket | null = null;
  let ackRetryTimer: number | undefined;
  let socketRetryTimer: number | undefined;
  let socketAttempt = 0;
  const listeners = Object.entries(definition.events).map(([name, map]) => [
    name,
    (data: unknown) => {
      if (closed) return;
      stopSnapshotTimer();
      options.onEvent(map(data as never));
    },
  ] as const);

  // เรียก onNoSnapshot ครั้งเดียวถ้าไม่ได้ข้อมูลแรกภายในเวลาที่กำหนด
  let snapshotTimer = options.onNoSnapshot
    ? window.setTimeout(() => {
        snapshotTimer = undefined;
        options.onNoSnapshot?.();
      }, FIRST_SNAPSHOT_TIMEOUT_MS)
    : undefined;

  function stopSnapshotTimer() {
    window.clearTimeout(snapshotTimer);
    snapshotTimer = undefined;
  }

  function setStatus(status: StreamStatus) {
    if (!closed) options.onStatusChange?.(status);
  }

  // Function เลิกฟัง event ของ stream นี้ (unsubscribe = บอก server เลิกส่งด้วย)
  function close(unsubscribe: boolean) {
    if (closed) return;
    closed = true;
    stopSnapshotTimer();
    window.clearTimeout(ackRetryTimer);
    window.clearTimeout(socketRetryTimer);
    listeners.forEach(([name, listener]) => socket?.off(name, listener));
    if (activeStreams.get(stream) === entry) {
      activeStreams.delete(stream);
      if (unsubscribe && socket?.connected) socket.emit(`${stream}:unsubscribe`);
    }
    options.onStatusChange?.("closed");
  }

  async function subscribe() {
    if (closed || !socket?.connected) return;
    window.clearTimeout(ackRetryTimer);
    let ack: SocketAck<TSnapshot>;
    try {
      ack = (await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(`${stream}:subscribe`, payload)) as SocketAck<TSnapshot>;
    } catch {
      // ไม่ได้ ack ตามเวลา ลองใหม่ถ้ายังต่ออยู่ (หลุดไปแล้ว connect จะ subscribe ใหม่เอง)
      setStatus("reconnecting");
      ackRetryTimer = window.setTimeout(() => void subscribe(), RECONNECT_DELAYS_MS[1]);
      return;
    }
    // closed เปลี่ยนจาก function เลิก subscribe ระหว่างรอ ack
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ดูบรรทัดบน
    if (closed) return;

    // เช่น FORBIDDEN, INVALID_DATE_RANGE subscribe ใหม่ก็ไม่หาย
    if (!ack.ok) {
      const error = toAckError(ack.error);
      close(false);
      options.onFatalError?.(error);
      return;
    }

    setStatus("open");
    stopSnapshotTimer();
    const snapshot = definition.toSnapshot(ack.data);
    if (snapshot) options.onEvent(snapshot);
  }

  const entry: ActiveStream = {
    subscribe: () => void subscribe(),
    setStatus,
    forbid: () => {
      close(false);
      options.onFatalError?.(toApiError(403, { code: "FORBIDDEN", message: "Forbidden" }, "คุณไม่มีสิทธิ์ใช้งานส่วนนี้"));
    },
    replace: () => close(false),
  };

  // ตัวเดิมของ stream นี้หยุดฟัง server จะใช้ payload ของตัวใหม่แทน
  activeStreams.get(stream)?.replace();
  activeStreams.set(stream, entry);
  setStatus("connecting");

  function attach() {
    getSocket()
      .then((instance) => {
        if (closed) return;
        socket = instance;
        listeners.forEach(([name, listener]) => instance.on(name, listener));
        // ยังไม่ต่อ = connect จะ subscribe ให้
        if (instance.connected) void subscribe();
      })
      .catch((error: unknown) => {
        if (closed) return;
        // 401 unwrap พาไปหน้า login แล้ว 403 = ไม่มีสิทธิ์
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          close(false);
          if (error.status === 403) options.onFatalError?.(error);
          return;
        }
        setStatus("reconnecting");
        socketRetryTimer = window.setTimeout(attach, RECONNECT_DELAYS_MS[Math.min(socketAttempt, RECONNECT_DELAYS_MS.length - 1)]);
        socketAttempt += 1;
      });
  }

  attach();

  return () => close(true);
}

export type { StreamDefinition };
export { subscribeStream };
