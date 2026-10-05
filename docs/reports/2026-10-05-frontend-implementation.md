# Báo cáo triển khai frontend ngày 05/10/2026

## Phạm vi kiểm tra

Kiểm tra các thay đổi chưa commit so với `HEAD`, bao gồm file được sửa, file mới, ảnh và các file mẫu bị thay thế. Đối chiếu với `AGENTS.md`, `CONTEXT.md`, kế hoạch kiến trúc, yêu cầu Identity/Catalog/Booking/Payment, ADR 0002 và tài liệu thiết kế frontend.

Các module bị ảnh hưởng: Catalog, giao diện Scheduling, Booking, Payment và Identity. Thay đổi chủ yếu là giao diện React + TypeScript, dữ liệu demo và hợp đồng tích hợp; không triển khai nghiệp vụ backend trong commit này.

## Các phần đã triển khai

| Trang / phần | Nội dung đã làm |
|---|---|
| Cinema Discovery (`/`) | Giao diện sáng, phim nổi bật, danh sách phim, thông tin phim trong hộp thoại và điều hướng tới showtime. Khu vực liên kết danh sách phim được đổi thành `View all movies` dẫn tới Movie List. |
| Movie List (`/movie-list`) | Sidebar tối theo mẫu, vùng nội dung sáng đồng bộ với Discovery; điều chỉnh kích thước chữ. Tìm kiếm tên phim, lọc thể loại, All Films, Trending Now, New Releases và My Watchlist. Watchlist demo lưu trong localStorage và vẫn hoạt động trong phiên khi storage không khả dụng. |
| Movie Showtime (`/movie-showtime`) | Hiển thị thông tin phim, lựa chọn ngày, rạp và giờ chiếu. Nút chọn ghế chỉ được bật khi các lựa chọn hợp lệ. Query phim được đọc trong component để hoạt động khi quay lại từ đăng nhập bằng React Router. |
| Seat Selection (`/seat-selection`) | Sơ đồ demo 8 hàng × 14 ghế, phân biệt ghế trống/đã chọn/đã đặt, tổng tiền và điều hướng checkout. Giới hạn 10 ghế; vẫn cho bỏ chọn khi đạt giới hạn. Thu gọn khoảng cách với header; màn hình nhỏ có vùng cuộn ngang sơ đồ ghế. |
| Ticket Checkout (`/ticket-checkout`) | Tóm tắt phim, suất chiếu, ghế, phí dịch vụ và tổng tiền VND. Thêm/bỏ popcorn hoặc champagne cập nhật tổng tiền. Sử dụng ảnh được cung cấp, có biểu tượng thay thế khi ảnh tải lỗi. |
| Credit / debit card | Bỏ trường CUSTOMER NAME. Chọn Credit mới hiển thị Card Number, Expiration Date và Security Code. Định dạng số thẻ, kiểm tra 13–19 chữ số, tháng/năm hết hạn và mã bảo mật 3–4 số. Nút tiếp tục chỉ bật khi nhập hợp lệ. Chuyển sang E-wallet xóa các trường thẻ khỏi giao diện. |
| E-wallet | Chọn phương thức chưa hiển thị QR. Bấm Continue to Payment mở hộp thoại kiểm tra phim, ghế, phương thức và tổng tiền; chỉ Confirm & Continue mới hiện QR banking. Cancel, đóng hộp thoại hoặc Esc quay về checkout. Đóng QR rồi tiếp tục lại phải xác nhận lại. Credit cũng đi qua bước xác nhận. |
| Login (`/login`) | Form email/password, hiện/ẩn mật khẩu, Remember me, liên kết Forgot password và Register, nút Google/Apple ID và hiển thị lỗi dịch vụ. Đăng nhập thành công từ backend quay lại đường dẫn hợp lệ trước đó. |
| Register (`/register`) | Form tên/email/password/confirm password và đồng ý điều khoản. Send Verification Code chuyển sang bước nhập 6 số sau khi backend trả challenge hợp lệ. Hỗ trợ chuyển focus, Backspace/phím mũi tên, dán mã, Verify Email và Resend Code. Chỉ phản hồi EMAIL_VERIFIED từ backend mới hiển thị xác minh thành công. |
| Forgot Password (`/forgot-password`) | Form gửi yêu cầu đặt lại mật khẩu tới Identity API; thông báo không tiết lộ email có tài khoản hay không. |
| Routing / Layout | `BrowserRouter` và khai báo route trong `src/routes/app-routes.tsx`. Ba trang tài khoản dùng chung `AuthLayout`, nested routes và `<Outlet />`; các liên kết tài khoản dùng `<Link>` để chuyển trang không tải lại toàn bộ ứng dụng. Mỗi route khởi tạo form riêng và giữ `returnTo`; phản hồi của form đã rời đi không tự điều hướng sang trang khác. |

## Mã nguồn, dữ liệu và tài nguyên

- `frontend/src/demo-movie-data.ts` tập trung dữ liệu phim, thể loại, bộ sưu tập, rạp, ngày/giờ demo, sơ đồ ghế, giá vé, phí và concession; có các hàm tạo/kiểm tra đường dẫn điều hướng.
- `frontend/src/site-header.tsx` dùng chung header, tiến trình đặt vé, vị trí demo và liên kết đăng nhập.
- `frontend/src/features/booking/booking-limits.ts` và `selection.ts` dùng chung giới hạn ghế, kiểm tra ghế hợp lệ, ghế trùng, ghế đã đặt và dữ liệu checkout trên URL.
- `frontend/src/api/identity-api.ts` tách các lời gọi Identity: CSRF, cookies, timeout, đăng nhập, đăng ký, xác minh/gửi lại mã và yêu cầu reset password. Google/Apple chuyển tới backend URL được cấu hình.
- `frontend/.env.example` chỉ khai báo các URL công khai; không chứa thông tin đăng nhập hoặc provider secret.
- Thêm các ảnh phim và concession trong `frontend/public/images/`, gồm `truffle_popcorn.jpg` và `Rupert-Rothschild_Festive-Campaign_01-scaled.jpg`.
- Thêm Lucide React, React Router và qrcode.react vào frontend; cập nhật manifest/lockfile. Thay giao diện mẫu `App.tsx`/`App.css` bằng các trang của ứng dụng, cập nhật CSS nền và metadata HTML.

## Tài liệu đã bổ sung / cập nhật

- `AGENTS.md` và yêu cầu: giới hạn 10 ghế, đăng ký/đăng nhập bằng Google/Apple được cấu hình, mã xác minh email đăng ký gồm 6 số và kiểm tra phía server.
- `docs/design/software-structure.md`: routing frontend, layout tài khoản và yêu cầu phục vụ entry document khi mở trực tiếp một route.
- `docs/design/identity-frontend-contract.md`: cấu hình URL, hợp đồng API Identity đề xuất, mã xác minh, social authentication và điều hướng tài khoản.
- `docs/design/checkout-frontend.md`: các trường thẻ demo, bước xác nhận, hiển thị QR và ranh giới tích hợp payment provider.
- `docs/setup/frameworks.md`: thư viện frontend và quy tắc khai báo dependency theo npm workspace.
- `docs/design/DB.md`: đưa bản nháp thiết kế dữ liệu hiện có vào quản lý phiên bản; vẫn là đề xuất thảo luận, chưa phải schema/migration được phê duyệt.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Xem git diff và các file mới | Đã đối chiếu phạm vi thay đổi, dữ liệu demo, điều kiện bật nút, routing và tài liệu. |
| `npm.cmd run lint:frontend` | PASS — ESLint toàn bộ frontend. |
| `npm.cmd run build:frontend` | PASS — TypeScript và Vite production build. |
| `git diff --check` | PASS — không có lỗi whitespace trong diff được kiểm tra. |

Chưa chạy TestCafe E2E hoặc kiểm thử thanh toán/Identity với backend. Các kiểm tra build/lint không chứng minh nghiệp vụ server hay tích hợp provider đã hoàn tất.

## Trạng thái tích hợp

- Catalog/showtime/seat layout đang dùng dữ liệu demo. Chưa tạo seat hold 10 phút, chưa xử lý đặt ghế đồng thời hoặc trạng thái ghế server.
- Checkout chỉ mở xác nhận và preview. QR chứa nhãn `DEMO_ONLY_NOT_A_PAYMENT` cùng tổng tiền VND; không có tài khoản nhận tiền và không dùng để chuyển khoản thật.
- Thông tin thẻ chỉ tồn tại trong các input đang hiển thị; không lưu vào React state, URL, storage hay gửi lên server. Khi tích hợp thật phải dùng trường/tokenization của payment provider.
- Chưa tạo Payment Attempt, xác nhận Booking hoặc phát hành Ticket. Các quy tắc idempotency, callback đã xác thực và đối soát kết quả tiếp tục thuộc backend Payment.
- Frontend Identity đã có form và lời gọi theo hợp đồng đề xuất; backend đăng ký/đăng nhập, gửi email xác minh, reset password và OAuth callback chưa triển khai. Khi chưa cấu hình endpoint, UI báo dịch vụ chưa khả dụng và không giả lập tài khoản/session đã xác thực.
