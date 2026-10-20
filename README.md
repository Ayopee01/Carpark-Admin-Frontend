# Smart Carpark Admin Frontend

หน้าแอดมินของระบบลานจอดรถ (Next.js 16, React 19) ใช้ Next.js เป็น Backend for Frontend: browser คุยกับ server ของหน้าเว็บเท่านั้น
server ของหน้าเว็บเรียก Smart Carpark API ด้วย Bearer token ที่เก็บใน httpOnly cookie ของโดเมน Admin (browser ไม่เห็น token)

## โครงสร้าง

```
browser ── หน้า (Server Component) ──────────┐
        ── อ่านข้อมูล  GET /api/** (Route Handler) ──┼── lib/data (Data Access Layer) ── Smart Carpark API
        ── เปลี่ยนข้อมูล Server Action (lib/actions) ──┘
        ── WebSocket สถานะชำระเงิน ── ต่อตรงไป API ด้วย ticket ใช้ครั้งเดียว
```

| ที่ | หน้าที่ |
| --- | --- |
| `src/proxy.ts` | ก่อนทุกหน้าใน `/landing` และ `/api`: ไม่มี session ไปหน้า login, access token ใกล้หมดอายุ refresh ให้ |
| `src/app/lib/server/` | ฝั่ง server เท่านั้น: เรียก backend (`backend.ts`), cookie และ refresh (`session.ts`), ผู้ใช้และสิทธิ์ (`auth.ts`, `page.tsx`) |
| `src/app/lib/data/` | Data Access Layer เรียก backend ทีละ endpoint (ใช้ได้เฉพาะฝั่ง server) |
| `src/app/lib/actions/` | Server Action ของทุกการเปลี่ยนข้อมูล คืน `ActionResult` (ฝั่ง browser ห่อด้วย `unwrap`) |
| `src/app/api/` | Route Handler สำหรับอ่านข้อมูลจาก browser |
| `src/app/lib/client/` | ฝั่ง browser: อ่านข้อมูล (`queries.ts`), realtime Socket.IO (`events.ts`, `realtime.ts`), keepalive และออกจากระบบ (`session.ts`) |
| `src/app/landing/(main)/*/page.tsx` | Server Component ตรวจสิทธิ์ของหน้าและโหลดข้อมูลแรก แล้ว render `*View.tsx` (client) |

## พัฒนาในเครื่อง

```bash
cp .env.example .env.local   # API_INTERNAL_URL = URL ของ API เช่น http://localhost:8080
npm ci
npm run dev                  # http://localhost:3000 (ต้องอยู่ใน CORS_ORIGIN ของ API เพราะ Socket.IO ต่อตรง)
```

| Env (runtime) | ค่า |
| --- | --- |
| `API_INTERNAL_URL` | URL ของ API ที่ server ของหน้าเว็บเรียก (production: `http://smart-carpark-api:8080`) |
| `REALTIME_URL` | origin ของ API ที่ browser ต่อ Socket.IO `/admin` ตรง เช่น `https://api.<domain>` (ไม่ตั้ง = `/socket.io` ของโดเมนนี้ผ่าน Nginx) |

ตรวจก่อน push: `npm run lint`, `npm run typecheck`, `npm run build`

## CI/CD

| Workflow | เมื่อไหร่ | ทำอะไร |
| --- | --- | --- |
| `.github/workflows/ci.yml` job `check` | pull request และ push เข้า `main` | lint, typecheck, build |
| `.github/workflows/ci.yml` job `deploy` | push เข้า `main` หลัง `check` ผ่าน | build Docker image → push ไป GHCR → SSH เข้า server แล้ว `docker compose up` |
| `.github/dependabot.yml` | ทุกสัปดาห์ | เปิด PR อัปเดต npm, GitHub Actions และ Docker image (minor/patch รวม PR เดียว, major แยก PR) |

ยังไม่มี server: ไม่ต้องตั้งอะไร ถ้าไม่มี secret `DEPLOY_HOST` job `deploy` จะข้ามทุกขั้นตอนโดยไม่ fail ตั้ง secret ครบเมื่อไรจะ deploy เองโดยไม่ต้องแก้ workflow

image: `ghcr.io/<owner>/carpark-admin-frontend:<commit sha>` (และ `:latest`)
image ไม่ฝังค่าใดตอน build env ทั้งหมดอ่านตอน runtime image เดียวใช้ได้ทุก environment

### ตั้งค่าครั้งแรก

**GitHub** (Settings → Environments → `production`)

| ชนิด | ชื่อ | ค่า |
| --- | --- | --- |
| Variable | `DEPLOY_PATH` | โฟลเดอร์บน server เช่น `/srv/smart-carpark/admin` |
| Secret | `DEPLOY_HOST` | IP หรือ hostname ของ server |
| Secret | `DEPLOY_PORT` | port ของ SSH (ไม่ตั้ง = `22`) |
| Secret | `DEPLOY_USER` | user ที่ใช้ docker ได้ |
| Secret | `DEPLOY_SSH_KEY` | private key ของ user นั้น |

ใส่ Required reviewers ใน environment `production` ได้ถ้าต้องการให้มีคนกดอนุมัติก่อน deploy

**Server**

1. ติดตั้ง Docker และ Docker Compose v2.17 ขึ้นไป (ใช้ `--wait`)
2. สร้างโฟลเดอร์ตาม `DEPLOY_PATH` ให้ user ใน `DEPLOY_USER` เขียนได้
3. มี network `npm-network` ของ Nginx Proxy Manager อยู่แล้ว (เดียวกับ API ซึ่ง server ของหน้าเว็บเรียกผ่าน `http://smart-carpark-api:8080`)
4. Nginx Proxy Manager: Proxy Host ของโดเมน Admin → `smart-carpark-admin:3000` เปิด SSL
5. Realtime (Socket.IO `/admin` browser ต่อไปที่ API ตรงด้วย access token ที่ขอจาก Server Action) เลือกอย่างใดอย่างหนึ่ง ดู [Nginx](#nginx)
6. API: `CORS_ORIGIN` ต้องมี `https://<โดเมน Admin>` (ใช้กับ Socket.IO ด้วย)

ค่าที่ไม่ใช่ค่าเริ่มต้น (`API_INTERNAL_URL`, `REALTIME_URL`) ใส่ในไฟล์ `.env` ที่ `DEPLOY_PATH` ได้ `docker compose` อ่านเอง

### Nginx

`/api/**` และ `/uploads/**` ของโดเมน Admin เป็นของ Next.js **ห้าม** ส่งทั้งก้อนไปที่ API (จะทับ Route Handler)

**Realtime ทางที่ 1 (แนะนำ)** ต่อตรงไปโดเมนของ API ไม่ต้องแก้ Proxy Host ของโดเมน Admin

```env
# DEPLOY_PATH/.env
REALTIME_URL=https://api.<domain>
```

Proxy Host ของ API ต้องเปิด Websockets Support (ไม่เปิด Socket.IO จะใช้ HTTP long-polling แทน)

**Realtime ทางที่ 2** ไม่ตั้ง `REALTIME_URL` หน้าเว็บจะต่อ `https://<โดเมน Admin>/socket.io` ใส่ใน Advanced ของ Proxy Host ฝั่ง Admin:

```nginx
# /socket.io ไม่ชนกับ path ของ Next.js
location /socket.io/ {
  proxy_pass http://smart-carpark-api:8080;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $http_connection;
  proxy_read_timeout 1h;
}
```

workflow จะ copy `docker-compose.yml` ไปที่ `DEPLOY_PATH` ทุกครั้ง และ login GHCR ด้วย token ชั่วคราวของ job จึงไม่ต้องเก็บ token ไว้บน server

### Rollback

image ทุกตัวมี tag เป็น commit sha บน server รัน:

```bash
cd $DEPLOY_PATH
cat .deployed-image                       # image ที่ deploy ล่าสุด
ADMIN_IMAGE=ghcr.io/<owner>/carpark-admin-frontend:<sha เดิม> docker compose up -d --wait
```

ถ้า package บน GHCR เป็น private ต้อง `docker login ghcr.io` ด้วย token ที่มีสิทธิ์ `read:packages` ก่อน หรือเปิด run ของ CI ครั้งก่อนในแท็บ Actions แล้วกด Re-run all jobs (จะ deploy commit เดิม)
