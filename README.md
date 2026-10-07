# Smart Carpark Admin Frontend

หน้าแอดมินของระบบลานจอดรถ (Next.js 16, React 19) เรียก Smart Carpark API โดยตรงจาก browser
session อยู่ใน httpOnly cookie ของ API และ API อนุญาตโดเมนนี้ด้วย CORS (`ADMIN_ORIGINS`)

## พัฒนาในเครื่อง

```bash
cp .env.example .env.local   # ตั้ง NEXT_PUBLIC_API_BASE_URL เป็น origin ของ API เช่น http://localhost:8080
npm ci
npm run dev                  # http://localhost:3000 (ต้องอยู่ใน ADMIN_ORIGINS ของ API)
```

ตรวจก่อน push: `npm run lint`, `npm run typecheck`, `npm run build`

## CI/CD

| Workflow | เมื่อไหร่ | ทำอะไร |
| --- | --- | --- |
| `.github/workflows/ci.yml` job `check` | pull request และ push เข้า `main` | lint, typecheck, build |
| `.github/workflows/ci.yml` job `deploy` | push เข้า `main` หลัง `check` ผ่าน | build Docker image → push ไป GHCR → SSH เข้า server แล้ว `docker compose up` |
| `.github/dependabot.yml` | ทุกสัปดาห์ | เปิด PR อัปเดต npm, GitHub Actions และ Docker image (minor/patch รวม PR เดียว, major แยก PR) |

ยังไม่มี server: ไม่ต้องตั้งอะไร ถ้าไม่มี secret `DEPLOY_HOST` job `deploy` จะข้ามทุกขั้นตอนโดยไม่ fail ตั้ง secret ครบเมื่อไรจะ deploy เองโดยไม่ต้องแก้ workflow

image: `ghcr.io/<owner>/carpark-admin-frontend:<commit sha>` (และ `:latest`)
`NEXT_PUBLIC_API_BASE_URL` ถูกฝังตอน build image ถ้าเปลี่ยนค่าต้อง deploy ใหม่

### ตั้งค่าครั้งแรก

**GitHub** (Settings → Environments → `production`)

| ชนิด | ชื่อ | ค่า |
| --- | --- | --- |
| Variable | `NEXT_PUBLIC_API_BASE_URL` | origin ของ API เช่น `https://api.<domain>` |
| Variable | `DEPLOY_PATH` | โฟลเดอร์บน server เช่น `/srv/smart-carpark/admin` |
| Secret | `DEPLOY_HOST` | IP หรือ hostname ของ server |
| Secret | `DEPLOY_PORT` | port ของ SSH (ไม่ตั้ง = `22`) |
| Secret | `DEPLOY_USER` | user ที่ใช้ docker ได้ |
| Secret | `DEPLOY_SSH_KEY` | private key ของ user นั้น |

ใส่ Required reviewers ใน environment `production` ได้ถ้าต้องการให้มีคนกดอนุมัติก่อน deploy

**Server**

1. ติดตั้ง Docker และ Docker Compose v2.17 ขึ้นไป (ใช้ `--wait`)
2. สร้างโฟลเดอร์ตาม `DEPLOY_PATH` ให้ user ใน `DEPLOY_USER` เขียนได้
3. มี network `npm-network` ของ Nginx Proxy Manager อยู่แล้ว (เดียวกับ API)
4. Nginx Proxy Manager: Proxy Host ของโดเมน Admin → `smart-carpark-admin:3000` เปิด SSL

workflow จะ copy `docker-compose.yml` ไปที่ `DEPLOY_PATH` ทุกครั้ง และ login GHCR ด้วย token ชั่วคราวของ job จึงไม่ต้องเก็บ token ไว้บน server

### Rollback

image ทุกตัวมี tag เป็น commit sha บน server รัน:

```bash
cd $DEPLOY_PATH
cat .deployed-image                       # image ที่ deploy ล่าสุด
ADMIN_IMAGE=ghcr.io/<owner>/carpark-admin-frontend:<sha เดิม> docker compose up -d --wait
```

ถ้า package บน GHCR เป็น private ต้อง `docker login ghcr.io` ด้วย token ที่มีสิทธิ์ `read:packages` ก่อน หรือเปิด run ของ CI ครั้งก่อนในแท็บ Actions แล้วกด Re-run all jobs (จะ deploy commit เดิม)
