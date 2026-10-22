# Movie Ticket Management System

Ứng dụng web đặt vé xem phim trực tuyến, được phát triển cho môn Kiểm chứng phần mềm. Dự án sử dụng React cho giao diện, Spring Boot cho REST API và PostgreSQL trên Supabase để lưu trữ dữ liệu. TestCafe được dùng để kiểm thử các luồng thao tác trên trình duyệt.

## Truy cập ứng dụng

| Thành phần | Địa chỉ | Hosting |
|---|---|---|
| Frontend | [Mở ứng dụng](https://movie-ticket-management-system-azure.vercel.app/) | Vercel |
| Backend | [Địa chỉ backend](https://movie-ticket-backend-mclp.onrender.com/) | Render |
| Health check | [GET /api/v1/health](https://movie-ticket-backend-mclp.onrender.com/api/v1/health) | Render |

Người dùng truy cập frontend để sử dụng ứng dụng. Backend cung cấp API dưới `/api/v1/`; đường dẫn gốc `/` không có trang giao diện. Health check trả về `{"status":"UP"}` khi HTTP server hoạt động; endpoint này không kiểm tra toàn bộ kết nối database hay dịch vụ email.

## Chức năng hiện có

- Đăng ký bằng email/mật khẩu, gửi mã xác minh 6 số qua Resend và gửi lại mã. Mã có hiệu lực 10 phút; gửi lại sau ít nhất 60 giây.
- Đăng nhập, duy trì phiên bằng cookie HttpOnly và đăng xuất từ menu tài khoản.
- Đăng nhập Google OpenID Connect khi đã cấu hình OAuth. Google xác minh email thành công có thể kích hoạt Customer theo quy tắc của dự án.
- Backend kiểm soát quyền Customer, Admin và Cinema Staff; đăng ký công khai chỉ tạo Customer.
- Giao diện khám phá phim, tìm kiếm/lọc, xem suất chiếu, chọn tối đa 10 ghế và xem trước checkout với dữ liệu demo.

Luồng giữ ghế, thanh toán qua nhà cung cấp và phát hành vé chưa được tích hợp đầy đủ với backend. QR trong checkout hiện là QR demo, không dùng để chuyển tiền hoặc xác nhận mua vé. Backend có API đặt lại mật khẩu; giao diện nhập mật khẩu mới từ token và Apple ID chưa được triển khai. Xem [Identity](docs/design/identity.md) và [Checkout frontend](docs/design/checkout-frontend.md) để biết phạm vi chi tiết.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS 4 |
| Backend | Java 21, Spring Boot 4, Spring Security, JDBC/JPA |
| Database | PostgreSQL trên Supabase |
| Identity | Session cookie, CSRF, BCrypt, Google OIDC |
| Email | Resend HTTPS API; SMTP là lựa chọn cấu hình thay thế |
| Kiểm thử | TestCafe, JUnit 5, Mockito, Spring Boot Test |
| Triển khai | Vercel, Render, Docker |

Backend sử dụng kiến trúc modular monolith, chia theo các module nghiệp vụ Identity, Catalog, Venue, Scheduling, Booking, Payment, Tickets và Ticket Validation. Xem [kế hoạch kiến trúc](docs/design/software-structure.md).

## Chạy trên máy local

### 1. Chuẩn bị

- Node.js và npm; môi trường đã được kiểm tra với Node.js 24 và npm 11.
- JDK 21 và biến `JAVA_HOME` trỏ tới JDK.
- PostgreSQL/Supabase đã có schema ứng dụng theo [hướng dẫn database](backend/src/main/resources/db/migration/README.md). Khởi động backend không tự áp dụng migration.
- Resend API key và địa chỉ gửi email đã được cấp quyền để sử dụng đăng ký bằng email.

Các lệnh dưới đây chạy bằng PowerShell từ thư mục gốc repository, trừ khi có ghi chú khác.

### 2. Cài dependency và cấu hình

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Nếu đã có `.env`, giữ file hiện tại và bổ sung các biến còn thiếu. Điền các giá trị sau trong `.env`:

| Biến | Mục đích |
|---|---|
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES` | Host, port và tên database |
| `POSTGRES_USER`, `POSTGRES_PASSWORD` | Tài khoản backend kết nối PostgreSQL |
| `RESEND_API_KEY` | API key gửi email, chỉ dùng ở backend |
| `IDENTITY_MAIL_FROM` | Địa chỉ gửi email thuộc domain đã xác minh trên Resend |
| `IDENTITY_MAIL_PROVIDER` | `resend` mặc định; có thể chọn `smtp` |
| `FRONTEND_URL` | Origin frontend; local dùng `http://localhost:5173` |

Backend đọc `.env` ở thư mục gốc; biến môi trường hệ điều hành được ưu tiên. Cấu hình PostgreSQL hiện yêu cầu SSL. Không commit `.env`, API key hoặc mật khẩu; không đặt secret trong biến `VITE_*`.

### 3. Khởi động backend

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = 'dev'
.\mvnw.cmd spring-boot:run
```

Backend chạy tại `http://localhost:8080`. Kiểm tra HTTP server tại `http://localhost:8080/api/v1/health`.

Có thể dùng Docker Desktop thay cho chạy Maven, từ thư mục gốc:

```powershell
docker compose up -d --build backend
```

### 4. Khởi động frontend

Mở terminal khác ở thư mục gốc:

```powershell
npm.cmd run dev --workspace frontend
```

Truy cập `http://localhost:5173`. Vite proxy `/api`, `/oauth2` và `/login/oauth2/code` tới backend local. Email auth mặc định gọi `/api/v1/identity`, không cần thêm frontend env.

Đăng nhập Google local cần các biến sau trong `.env` ở thư mục gốc:

```dotenv
SPRING_PROFILES_ACTIVE=dev,google
GOOGLE_CLIENT_ID=<OAuth Client ID của bạn>
GOOGLE_CLIENT_SECRET=<OAuth Client Secret của bạn>
GOOGLE_REDIRECT_URI=http://localhost:5173/login/oauth2/code/google
FRONTEND_URL=http://localhost:5173
```

Đăng ký đúng callback trên trong Google Cloud. Sau khi điền cấu hình, chạy lại
`docker compose up -d --build backend` để cập nhật container. Nếu chạy Maven,
đổi biến PowerShell thành `$env:SPRING_PROFILES_ACTIVE = 'dev,google'` rồi khởi động lại backend.
Frontend mặc định dùng `/oauth2/authorization/google`, không cần thêm biến frontend.
Profile `dev` riêng lẻ chỉ bật email/password; endpoint Google sẽ trả 404 khi chưa bật
profile `google`. Xem [hướng dẫn Identity](docs/design/identity.md).

## Triển khai

Frontend trên Vercel dùng [rewrite](frontend/vercel.json) để chuyển API và OAuth tới backend Render, giữ các request của trình duyệt trên cùng origin để sử dụng session cookie và CSRF.

- **Vercel:** build frontend bằng Vite, output `dist` trong thư mục `frontend`. Identity API dùng `/api/v1/identity`; Google auth dùng `/oauth2/authorization/google` khi được bật.
- **Render:** root directory là `backend`, Dockerfile là `./Dockerfile`, profile `prod`. Cổng ứng dụng lấy từ biến `PORT` của Render; health check dùng `/api/v1/health`.
- **Environment backend:** cấu hình các biến `POSTGRES_*`, `RESEND_API_KEY`, `IDENTITY_MAIL_FROM`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và `GOOGLE_REDIRECT_URI`. Profile production hiện yêu cầu cấu hình Google OAuth.
- **OAuth production:** `FRONTEND_URL=https://movie-ticket-management-system-azure.vercel.app` và `GOOGLE_REDIRECT_URI=https://movie-ticket-management-system-azure.vercel.app/login/oauth2/code/google`. Đăng ký callback này trong Google Cloud.

File `.env` local không được đưa vào image hoặc Git deployment; cần đặt biến môi trường trực tiếp trên Render/Vercel. Session backend hiện lưu trong bộ nhớ của một instance, nên người dùng cần đăng nhập lại sau khi backend restart hoặc redeploy.

## Kiểm thử

### Chạy nhanh TestCafe

Chạy bằng PowerShell tại thư mục gốc repository. Cần cài dependencies và Chrome; mặc định các runner chạy Chrome headless nên không hiện cửa sổ.

| Lệnh | Nội dung | Chuẩn bị |
|---|---|---|
| `npm.cmd run test:e2e:browser` | 1 test kết nối Chrome | Không cần FE/BE hay database |
| `npm.cmd run test:e2e:pages` | 6 test trang lỗi và phục hồi luồng đặt vé | Runner tự mở và dừng Vite; không cần BE/database |
| `npm.cmd run test:e2e:identity` | 5 test đăng ký, xác minh, đăng nhập và Google | Docker Desktop, PostgreSQL test và backend JAR |

**Page Recovery — mở cửa sổ Chrome để xem test chạy:**

```powershell
$env:PAGE_TEST_BROWSER = 'chrome'
npm.cmd run test:e2e:pages
```

Quay lại headless:

```powershell
Remove-Item Env:PAGE_TEST_BROWSER -ErrorAction SilentlyContinue
npm.cmd run test:e2e:pages
```

**Identity — với container test đã được tạo theo [hướng dẫn Identity](docs/design/identity.md):**

```powershell
docker start movie-ticket-identity-tests
cd backend
.\mvnw.cmd -B -ntp -DskipTests package
cd ..
$env:IDENTITY_TEST_BROWSER = 'chrome'
npm.cmd run test:e2e:identity
```

Để Identity trở về headless, chạy `Remove-Item Env:IDENTITY_TEST_BROWSER -ErrorAction SilentlyContinue`. Biến này cũng điều khiển browser của `test:e2e:browser`. Các biến `$env:...` chỉ áp dụng trong terminal hiện tại.

Ảnh chụp khi lỗi nằm trong `artifacts/page-recovery-e2e/` hoặc `artifacts/identity-e2e/`; log Identity nằm trong thư mục tương ứng. Mỗi lần chạy dùng profile test riêng. Xem [hướng dẫn đầy đủ và xử lý lỗi](docs/setup/running-tests.md).

### Kiểm tra frontend và backend

Kiểm tra frontend từ thư mục gốc:

```powershell
npm.cmd run lint:frontend
npm.cmd run build:frontend
```

Chạy kiểm thử adapter Resend bằng HTTP server giả lập, không cần database và không gửi email thật:

```powershell
cd backend
.\mvnw.cmd -B -ntp '-Dtest=ResendIdentityMailTests' test
```

Kiểm thử tích hợp Identity cần PostgreSQL test riêng. Sau khi chuẩn bị container test và đóng gói backend theo [hướng dẫn Identity](docs/design/identity.md), chạy TestCafe từ thư mục gốc:

```powershell
node tests/test-data/run-identity-e2e.mjs
```

Runner dùng backend thật, database test riêng và Google/Resend giả lập trên loopback. Xem [hướng dẫn kiểm thử](docs/setup/running-tests.md), [ca kiểm thử Identity](tests/test-cases/identity.md) và [traceability](tests/traceability/README.md). Kết quả, log và ảnh chụp được lưu trong `artifacts/`, không commit vào Git.

## Cấu trúc repository

```text
frontend/       React + TypeScript, giao diện và API client
backend/        Spring Boot, business modules và SQL migration
tests/          Test cases, TestCafe, fixtures và traceability
docs/           Requirements, planning, thiết kế và ADR
scripts/        Script cài đặt và tiện ích phát triển
artifacts/      Kết quả kiểm thử được sinh local, Git ignored
```

Quy tắc nghiệp vụ được duy trì trong [AGENTS.md](AGENTS.md), thuật ngữ chuẩn trong [CONTEXT.md](CONTEXT.md). Khi phát triển tính năng, đối chiếu requirement, acceptance criteria và kiểm thử tương ứng.
