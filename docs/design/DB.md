# Thiết kế cơ sở dữ liệu và schema Supabase

**Trạng thái:** Đã viết schema ban đầu để review; chưa chạy trên database. Các quyết định nghiệp vụ đã chốt được ghi riêng, những lựa chọn triển khai mới vẫn cần review.

**Quyết định đã chốt ngày 2026-10-08:** Không đưa bảng session vào thiết kế database hiện tại. Mỗi Booking đã xác nhận có một Ticket/QR cho toàn bộ ghế, hỗ trợ check-in nhiều đợt đến khi đủ số người tương ứng với số ghế đã mua; xem [ADR 0003](../adr/0003-booking-qr-group-check-in.md).

**Bổ sung đã chốt:** `payment_reversals` và `password_reset_tokens` là bảng chính. Schema hiện có **22 bảng**, gồm thêm `user_identities` phục vụ yêu cầu Google/Apple. File SQL: [V1__movie_ticket_schema.sql](../../backend/src/main/resources/db/migration/V1__movie_ticket_schema.sql); cách chạy và ranh giới trách nhiệm: [migration README](../../backend/src/main/resources/db/migration/README.md).

**Provider và check-in đã chốt:** SePay cho chuyển khoản ngân hàng, PayPal Sandbox cho thử Visa/Mastercard. Admin nhập khoảng check-in riêng cho mỗi rạp: mở trước giờ bắt đầu và đóng sau giờ bắt đầu suất chiếu; xem [ADR 0005](../adr/0005-payment-providers-cinema-check-in.md).

## 1. Căn cứ và phạm vi

Bản nháp được lập từ các nguồn sau:

- [AGENTS.md](../../AGENTS.md): quy tắc nghiệp vụ và ràng buộc của dự án.
- [CONTEXT.md](../../CONTEXT.md): thuật ngữ của dự án.
- [Software Structure Plan](software-structure.md): kiến trúc và quyền sở hữu dữ liệu của các module.
- [Yêu cầu và product backlog](../requirements/online-movie-ticket-booking-project.md): phạm vi, acceptance criteria và trạng thái nghiệp vụ.
- [ADR 0002](../adr/0002-modular-monolith-architecture.md): quyết định sử dụng modular monolith.
- [demo-movie-data.ts](../../frontend/src/demo-movie-data.ts), [cinema-discovery.tsx](../../frontend/src/cinema-discovery.tsx) và [movie-showtime.tsx](../../frontend/src/movie-showtime.tsx): dữ liệu và cách hiển thị giao diện demo.
- [backend/pom.xml](../../backend/pom.xml), [cấu hình dev](../../backend/src/main/resources/application-dev.yml) và [cấu hình test](../../backend/src/main/resources/application-test.yml): cấu hình kết nối PostgreSQL và JPA.
- Các README trong [test cases](../../tests/test-cases/README.md), [traceability](../../tests/traceability/README.md) và [TestCafe](../../tests/e2e/testcafe/README.md): vị trí các đặc tả và kiểm thử dự kiến.

Repo có cấu hình PostgreSQL + JPA và migration V1 cho Supabase/PostgreSQL. Entity và các workflow backend chưa được triển khai. Flyway được quy định trong kiến trúc, nhưng chưa được khai báo trong `backend/pom.xml`; việc viết migration không tự chạy SQL trên database.

Các bảng dưới đây thuộc tám module: Identity, Catalog, Venue, Scheduling, Booking, Payment, Tickets và Ticket Validation. Mỗi module sở hữu dữ liệu của mình; module khác sử dụng application contract thay vì truy cập trực tiếp repository hoặc bảng của module đó.

## 2. Danh sách bảng đề xuất

Quy ước:

- Mỗi bảng có khóa chính `id`, trừ bảng nối có thể sử dụng khóa chính ghép.
- Các cột `*_id` là khóa ngoại; `used_by` tham chiếu tài khoản nhân viên.
- SQL dùng UUID, `timestamptz`, số tiền `numeric(14,2)` và `CHECK` cho các trạng thái. Các bảng nghiệp vụ có timestamp theo nhu cầu, không tự xóa lịch sử.
- Các cột dưới đây là danh sách chính; file migration là định nghĩa đầy đủ về kiểu dữ liệu, index, constraint và trigger.

| STT | Module sở hữu | Bảng đề xuất | Mục đích | Cột chính dự kiến |
|---:|---|---|---|---|
| 1 | Identity | `users` | Tài khoản Customer, Admin và Cinema Staff | `email`, `password_hash`, `full_name`, `phone`, `role`, `status`, `email_verified_at` |
| 2 | Identity | `email_verifications` | Xác thực email đăng ký và email mới khi đổi email | `user_id`, `target_email`, `purpose`, `token_hash`, `expires_at`, `consumed_at` |
| 3 | Catalog | `movies` | Thông tin phim | `slug`, `title`, `description`, `duration_minutes`, `age_rating`, `poster_url`, `release_date`, `status` |
| 4 | Catalog | `genres` | Danh mục thể loại | `name`, `slug` |
| 5 | Catalog | `movie_genres` | Quan hệ nhiều–nhiều giữa phim và thể loại | `movie_id`, `genre_id` |
| 6 | Venue | `locations` | Các khu vực Việt Nam được cấu hình | `name`, `code` |
| 7 | Venue | `cinemas` | Rạp thuộc một khu vực, có khoảng check-in riêng | `location_id`, `name`, `address`, `check_in_opens_before_minutes`, `check_in_closes_after_minutes` |
| 8 | Venue | `seat_layouts` | Mẫu sơ đồ ghế dùng lại cho nhiều phòng | `name`, `description` |
| 9 | Venue | `seat_layout_positions` | Các vị trí ghế trong mẫu sơ đồ | `seat_layout_id`, `seat_code`, `row_label`, `column_number`, `position_x`, `position_y` |
| 10 | Venue | `halls` | Phòng chiếu thuộc rạp, được gán mẫu sơ đồ | `cinema_id`, `seat_layout_id`, `name`, `layout_locked_at` |
| 11 | Venue | `seats` | Ghế vật lý của từng phòng | `hall_id`, `seat_layout_position_id`, `seat_code` |
| 12 | Scheduling | `showtimes` | Suất chiếu của phim trong một phòng | `movie_id`, `hall_id`, `starts_at`, `ends_at`, `base_price`, `currency`, `status` |
| 13 | Booking | `showtime_seats` | Trạng thái hiện tại của từng ghế theo suất chiếu | `showtime_id`, `seat_id`, `state`, `booking_id`, `hold_expires_at` |
| 14 | Booking | `bookings` | Giao dịch đặt vé của khách hàng | `customer_id`, `showtime_id`, `status`, `hold_started_at`, `hold_expires_at`, `total_amount`, `currency`, `confirmed_at` |
| 15 | Booking | `booking_seats` | Danh sách ghế đã yêu cầu và giá tại thời điểm đặt | `booking_id`, `showtime_id`, `seat_id`, `unit_price` |
| 16 | Payment | `payment_attempts` | Các lần thanh toán của một booking | `booking_id`, `provider`, `provider_environment`, `payment_method`, `provider_order_reference`, `provider_reference`, `idempotency_key`, `amount`, `currency`, `provider_amount`, `provider_currency`, `exchange_rate`, `exchange_rate_source`, `exchange_rate_quoted_at`, `status`, `is_active` |
| 17 | Payment | `payment_events` | Lưu kết quả callback, truy vấn trạng thái và đối soát | `payment_attempt_id`, `provider_event_id`, `event_type`, `reported_status`, `verification_status`, `received_at`, `processed_at` |
| 18 | Tickets | `tickets` | Một vé/QR cho cả Booking, theo dõi tổng số người đã vào | `booking_id`, `qr_token_hash`, `qr_token_ciphertext`, `qr_key_version`, `customer_name_snapshot`, `ticket_details_snapshot`, `admitted_count`, `issued_at`, `used_at`, `used_by` |
| 19 | Ticket Validation | `ticket_validation_logs` | Lưu các lần check-in để kiểm toán và chống cộng trùng request | `ticket_id`, `staff_id`, `expected_showtime_id`, `request_id`, `requested_count`, `admitted_count`, `result`, `scanned_at` |
| 20 | Payment | `payment_reversals` | Theo dõi yêu cầu hoàn tiền/hủy giao dịch và retry | `payment_attempt_id`, `operation_type`, `reason`, `amount`, `currency`, `status`, `provider_reference`, `idempotency_key`, `retry_count`, `last_error` |
| 21 | Identity | `password_reset_tokens` | Lưu token reset mật khẩu; chức năng vẫn thuộc Release 2 | `user_id`, `verified_email_snapshot`, `token_hash`, `expires_at`, `consumed_at` |
| 22 | Identity | `user_identities` | Liên kết cùng Customer với Google/Apple | `user_id`, `provider`, `provider_subject` |

`ticket_validation_logs.ticket_id` có thể rỗng khi QR không tham chiếu đến vé tồn tại. `payment_reversals` lưu kết quả xử lý với provider; không coi bản ghi hoàn tiền trong DB là bằng chứng provider đã hoàn tiền.

## 3. Ánh xạ dữ liệu demo

| Dữ liệu trong `demo-movie-data.ts` | Đích dự kiến | Ghi chú |
|---|---|---|
| `movies[].slug` | `movies.slug` | Duy nhất, phục vụ đường dẫn chi tiết phim |
| `movies[].title` | `movies.title` | Tên phim |
| `movies[].description` | `movies.description` | Nội dung giới thiệu phim |
| `movies[].minutes` | `movies.duration_minutes` | Thời lượng tính bằng phút |
| `movies[].rating` | `movies.age_rating` | Phân loại độ tuổi như `PG-13`, `R`; không phải điểm đánh giá |
| `movies[].image` | `movies.poster_url` | Lưu đường dẫn ảnh thay vì dữ liệu ảnh trong bảng phim |
| `movies[].genre[]` | `genres` và `movie_genres` | Một phim có thể có nhiều thể loại |
| `movies[].label` | Chưa chốt | Nhãn hiển thị hiện không hoàn toàn trùng với `genre[]`; cần xác định là nội dung biên tập hay chuỗi được tạo từ thể loại |
| `demoGenres` | Truy vấn `genres` | `All Genres` là lựa chọn giao diện |
| `demoCinemas[].name` | `cinemas.name` và quan hệ đến `locations` | Tách tên khu vực khỏi tên rạp |
| `demoCinemas[].times[]` | `showtimes.starts_at` | Còn thiếu phim, phòng và ngày cụ thể để tạo suất chiếu thật |
| `demoCinemas[].detail` | Chưa chốt | IMAX, âm thanh và ngôn ngữ cần được phân biệt trước khi xác định thuộc phòng hay suất chiếu |
| `demoFeaturedHero.ratingText` | Chưa chốt | Điểm `8.4` khác với phân loại độ tuổi; hiện chưa có yêu cầu về hệ thống đánh giá |
| Các nhãn và nút trên hero | Nội dung giao diện hoặc cấu hình trình bày | Chưa đủ căn cứ để tạo bảng nghiệp vụ riêng |

Các tab `Coming Soon`, `Festivals & Specials` và nội dung featured hiện là giao diện demo; chưa đủ yêu cầu nghiệp vụ để xác định thêm bảng hoặc trạng thái dữ liệu cho chúng.

## 4. Quan hệ chính

- `movies` nhiều–nhiều `genres`, qua `movie_genres`.
- `locations` một–nhiều `cinemas`; `cinemas` một–nhiều `halls`.
- `seat_layouts` một–nhiều `seat_layout_positions`; một mẫu có thể được gán cho nhiều `halls`.
- `halls` một–nhiều `seats` và một–nhiều `showtimes`.
- `movies` một–nhiều `showtimes`.
- Một ghế vật lý xuất hiện trong nhiều `showtime_seats`, mỗi bản ghi thuộc một suất chiếu riêng.
- Customer một–nhiều `bookings`; mỗi booking thuộc một suất chiếu và có nhiều `booking_seats`.
- `bookings` một–nhiều `payment_attempts`; `payment_attempts` một–nhiều `payment_events`.
- Quan hệ Booking–Ticket đã chốt một–một: chỉ tạo Ticket sau khi Booking được xác nhận, `tickets.booking_id` duy nhất. Một QR dùng chung cho tất cả ghế trong Booking và có thể check-in nhiều đợt.
- `tickets` một–nhiều `ticket_validation_logs`; mỗi lần check-in có request riêng, dùng lại cùng QR cho nhóm đến sau.

## 5. Ràng buộc nghiệp vụ cần bảo toàn

### Identity

- Email là định danh đăng nhập duy nhất của Customer. Tài khoản đăng ký mới chưa được hoạt động bình thường trước khi xác thực email.
- Khi đổi email, `users.email` vẫn giữ email đã xác thực hiện tại; email mới nằm trong yêu cầu xác thực cho đến khi xác thực thành công và kiểm tra lại tính duy nhất.
- Đổi email phải giữ nguyên Customer identity và quan hệ Booking/Ticket. Password reset sử dụng email đã xác thực hiện tại.
- Chỉ lưu password hash và token hash; Admin/Staff được provision hoặc seed, không tạo qua đăng ký công khai.
- Không có bảng session trong thiết kế database hiện tại. Cookie phiên đăng nhập vẫn theo ADR 0002; nơi lưu dữ liệu phiên phía backend sẽ được xác định khi triển khai Identity. Cookie không thay thế dữ liệu Booking, Seat Hold hay Payment Attempt trong database.

### Catalog, Venue và Scheduling

- Location/Cinema của suất chiếu được truy ra qua `showtimes.hall_id → halls.cinema_id → cinemas.location_id` để tránh các khóa ngoại dư thừa không nhất quán.
- Phim có mặt tại Location được suy ra từ showtime; không cần bảng độc lập `movie_locations`.
- Phòng đã từng được dùng bởi Showtime phải giữ nguyên sơ đồ ghế, kể cả sau khi suất chiếu bị gỡ. Mẫu và vị trí ghế đang được sử dụng cũng phải được bảo vệ khỏi chỉnh sửa làm thay đổi ý nghĩa lịch sử.
- Ghế phải thuộc đúng phòng của suất chiếu. `seat_code` duy nhất trong một phòng.
- Suất chiếu cùng phòng không được chồng lịch và phải có khoảng đệm 15 phút. Nếu lưu `ends_at`, cần quy định rõ cách tính từ thời lượng phim và kiểm tra khi sửa thời lượng.
- Không gỡ Showtime có Booking đã xác nhận. Không archive Movie có Showtime tương lai và không tạo Showtime mới cho Movie đã archive.
- Không xóa dữ liệu lịch sử làm đứt quan hệ Booking/Ticket.

### Booking và ghế

- `showtime_seats` là nguồn trạng thái ghế hiện tại với các trạng thái `AVAILABLE`, `HELD`, `BOOKED`. `booking_seats` giữ danh sách ghế được yêu cầu và giá lịch sử, kể cả khi hold hết hạn.
- Cặp `(showtime_id, seat_id)` trong `showtime_seats` phải duy nhất. Cùng một ghế có thể thuộc nhiều booking lịch sử, nhưng tại một thời điểm chỉ một booking được giữ hoặc sở hữu ghế cho cùng suất chiếu.
- Giữ toàn bộ ghế được yêu cầu trong một transaction; kiểm tra lại trạng thái phía server và xử lý tranh chấp bằng cơ chế khóa/cập nhật nguyên tử.
- Thời hạn hold là 10 phút từ lúc giữ ghế thành công. Bản nháp lưu thời điểm gốc trên `bookings`, nên chưa cần bảng `seat_holds` riêng. Nếu lưu thêm thời hạn trong `showtime_seats`, phải đồng bộ từ cùng thời hạn gốc.
- Retry payment không gia hạn hold. Payment `FAILED` không giải phóng ghế ngay; hold hết hạn hoặc kết thúc booking được xử lý theo quy tắc dự án.
- Sold Out chỉ được suy ra khi tất cả ghế là `BOOKED`; các ghế `HELD` không làm suất chiếu trở thành Sold Out.

### Payment

- Provider: `SEPAY` + `BANK_TRANSFER` ở `TEST` hoặc `LIVE`; `PAYPAL` + `CARD` chỉ ở `SANDBOX`; `FAKE` + `FAKE` ở `TEST` cho các test xác định. Môi trường và method lưu trên từng attempt, callback phải khớp môi trường đã tạo attempt.
- `amount`/`currency` là giá gốc Booking. `provider_amount`/`provider_currency` là số tiền thực sự yêu cầu provider. Phương án V1 dùng SePay VND và PayPal Sandbox USD; lưu tỷ giá theo chiều tiền provider trên mỗi đơn vị tiền Booking, nguồn và thời điểm quote. Không tự đặt tỷ giá cố định, không thay đổi quote khi retry cùng attempt. Tạo attempt mới có thể lấy quote mới trong hold gốc.
- Kiểm tra kết quả với `provider_amount`/`provider_currency`, không so USD trực tiếp với VND. `payment_reversals.amount`/`currency` cũng dùng tiền provider. `provider_order_reference` lưu mã thanh toán/order dùng đối chiếu; `provider_reference` lưu transaction/capture được xác nhận. Khóa duy nhất gồm provider + môi trường để không lẫn test/live.
- SePay: kiểm tra xác thực webhook, tài khoản nhận, giao dịch tiền vào, mã attempt, số tiền và ID giao dịch. PayPal: xác thực webhook/API, đối chiếu order/capture và chỉ nhận capture thành công làm SUCCESS. Khả năng hoàn tiền/hủy của từng kênh cần xác minh khi tích hợp; chuyển khoản ngân hàng không mặc nhiên có API refund tự động.
- Một Booking có nhiều Payment Attempts nhưng chỉ một attempt active. Cần ràng buộc duy nhất có điều kiện và transaction khi tạo/retry attempt.
- Idempotency áp dụng theo từng Payment Attempt. Callback trùng không được tạo thêm xác nhận hoặc Ticket.
- Callback phải được kiểm tra chữ ký/xác thực, reference, amount, currency và trạng thái trước khi thay đổi Booking/Seat/Ticket.
- Xử lý rõ `SUCCESS`, `FAILED`, `CANCELLED`, `UNKNOWN`, `PENDING` và late `SUCCESS`. `UNKNOWN` yêu cầu truy vấn trạng thái provider; không tự coi là thất bại.
- Late `SUCCESS` chỉ được xác nhận khi toàn bộ ghế yêu cầu còn `AVAILABLE`, kiểm tra nguyên tử trong transaction. Nếu không thể cấp vé, phải lưu kết quả và theo dõi xử lý với provider.
- Việc xác nhận Booking, chuyển ghế sang `BOOKED` và phát hành Ticket phải nhất quán. Mọi thao tác liên module đi qua application contract.
- Không lưu thông tin thẻ hoặc tài khoản ngân hàng thô trong các bảng này.

### Tickets và Ticket Validation

- Ticket chỉ phát hành sau thanh toán thành công đã được xác thực. Snapshot phải đủ để hiển thị Movie, Cinema, Showtime, Seats, Customer name, Booking ID và Price tại thời điểm phát hành; QR được cung cấp qua cơ chế phát hành đã chọn.
- Phương án V1: backend tạo QR token ngẫu nhiên, lưu hash để tra cứu và ciphertext để khôi phục cùng token khi mở My Tickets. Khóa mã hóa nằm ngoài database; `qr_key_version` hỗ trợ đổi khóa. Hash đơn lẻ không khôi phục được token.
- `tickets.admitted_count` khởi tạo bằng 0. Tổng quyền vào cửa bằng số ghế đã mua trong `booking_seats` của Booking đã xác nhận; số còn lại được suy ra bằng tổng đó trừ `tickets.admitted_count`, không lưu một nguồn sự thật riêng cho số còn lại.
- Sau khi kiểm tra QR và đúng showtime, Cinema Staff xác nhận số người thực tế cho vào ở lần này. Server chỉ chấp nhận số nguyên dương không vượt số còn lại; yêu cầu vượt giới hạn bị từ chối và không tăng bộ đếm. Nhân viên có thể xác nhận nhóm nhỏ hơn trong giới hạn, người dư không được vào.
- Ticket Validation cập nhật bộ đếm thông qua application contract của Tickets. Việc kiểm tra giới hạn và tăng `admitted_count` phải nguyên tử, giữ `0 <= admitted_count <= số ghế đã mua`, kể cả khi nhiều nhân viên quét cùng mã đồng thời.
- `used_at` và `used_by` chỉ được ghi khi đủ số người; `used_by` là nhân viên hoàn tất đợt cuối. Trước đó QR vẫn dùng được cho nhóm đến sau, trong điều kiện showtime hợp lệ. Khi đủ số người, khóa QR và từ chối mọi lần check-in tiếp theo.
- `ticket_validation_logs.admitted_count` là số người thực sự được ghi nhận ở lần đó; lần bị từ chối có giá trị 0. Log ghi nhân viên và thời điểm của từng đợt, nên không dùng `used_by` để đại diện cho toàn bộ lịch sử.
- `request_id` duy nhất cho mỗi thao tác check-in; gửi lại cùng request phải trả kết quả đã ghi mà không tăng thêm bộ đếm. Nhóm đến sau dùng request mới với cùng QR. Cập nhật bộ đếm và lưu log thành công phải nhất quán trong transaction qua application contract; cùng request với dữ liệu khác phải bị từ chối.
- Ví dụ Booking có 5 ghế: đợt đầu vào 3 người, QR còn 2 lượt; đợt sau vào 2 người thì khóa QR. Nếu đợt sau có 3 người, server từ chối count 3; nhân viên xác nhận chỉ 2 người vào và từ chối người dư.
- Mỗi Cinema bắt buộc có `check_in_opens_before_minutes` và `check_in_closes_after_minutes`, là số nguyên không âm do Admin nhập, không có mặc định chung. Khoảng hợp lệ là `[starts_at - mở_trước, starts_at + đóng_sau]`, bao gồm hai biên. Ví dụ cấu hình 30/15, suất 19:00: cho check-in 18:30–19:15; đây chỉ là ví dụ, không phải cấu hình cố định.
- Hàm `check_in_ticket` kiểm tra thời gian thực của server sau khi lấy lock; đến sớm/trễ trả `CHECK_IN_TOO_EARLY`/`CHECK_IN_TOO_LATE`, không cộng lượt. Nhóm đến sau cũng phải trong khoảng hợp lệ. Mỗi request mới dùng cấu hình hiện tại của Cinema; retry request đã ghi trả kết quả cũ và không cộng thêm.
- Ticket sắp tới luôn được hiển thị; lịch sử quá khứ có cửa sổ hiển thị 30 ngày. Không xóa bản ghi chỉ vì quá 30 ngày.
- Customer không được hủy Ticket đã mua thành công.

## 6. Lựa chọn triển khai trong schema V1

- Tất cả bảng thuộc schema riêng `movie_app`. React gọi Spring Boot; không truy cập bảng trực tiếp và không dùng `auth.users` làm nguồn tài khoản thứ hai. RLS bật cho mọi bảng, không có quyền truy cập cho trình duyệt; xem [ADR 0004](../adr/0004-supabase-schema-boundaries.md).
- `users`: `PENDING_VERIFICATION`, `ACTIVE`, `DISABLED`. Tài khoản active cần password hash hoặc identity provider; Customer active phải xác thực email. Backend xác thực code sáu chữ số, giới hạn thử/resend và kiểm tra liên kết social identity.
- `showtimes`: `DRAFT`, `PUBLISHED`, `REMOVED`. V1 tính giờ kết thúc từ thời lượng phim và dùng exclusion constraint cho cả thời gian chiếu + đệm 15 phút. Sửa thời lượng cập nhật các suất tương lai trong cùng transaction; thay đổi xung đột hoặc ảnh hưởng hold/Booking đã xác nhận bị từ chối. Suất cũ giữ thời lượng lịch sử.
- `bookings`: `HELD`, `EXPIRED`, `CANCELLED`, `CONFIRMED`, `REVERSAL_PENDING`, `REVERSED`. Hold gốc và danh sách ghế/giá đã đặt giữ nguyên; `CONFIRMED` không được chuyển sang hủy. Kết quả payment vẫn được lưu riêng trên Payment Attempt.
- V1 dùng giá ghế theo `showtimes.base_price`, tổng Booking bằng tổng giá snapshot trong `booking_seats`. Chưa có giá theo loại ghế, ưu đãi, phụ phí hoặc đồ ăn; checkout frontend hiện là demo và cần mô hình giá riêng trước khi tích hợp những mục này.
- `hall_id` trên `showtime_seats` và `seat_layout_id` trên `seats` là cột phục vụ khóa ngoại ghép: giá trị bị ràng buộc với quan hệ gốc, không thể gán độc lập sai phòng/sai mẫu. Không thêm `movie_locations` hay trạng thái Sold Out độc lập.
- Check-in dùng hàm `movie_app.check_in_ticket` do backend gọi sau xác thực staff. Hàm SQL khóa Ticket, kiểm tra khoảng thời gian của rạp và số còn lại, chống request trùng và ghi log cùng transaction.
- Seat hold và xác nhận thanh toán dùng transaction do application contract điều phối. Backend worker xử lý hết hạn; SQL không tự chạy timer hay xác thực chữ ký Payment Provider.

## 7. Điểm còn cần chốt trước khi tích hợp backend

1. Nơi lưu session phía backend; không có bảng session trong database hiện tại.
2. Credentials/môi trường SePay, tài khoản nhận tiền và khả năng xử lý hoàn tiền; thiết lập merchant/card sandbox PayPal và tỷ giá VND→USD/nguồn quote cho test.
3. Giá trị mở/đóng check-in cụ thể do Admin nhập cho từng Cinema, theo mốc giờ bắt đầu đã chốt.
4. Mô hình giá nếu đưa phụ phí, đồ ăn, loại ghế hoặc ưu đãi từ demo vào sản phẩm.
5. Định dạng chiếu, âm thanh, ngôn ngữ và nhãn biên tập khi có yêu cầu nghiệp vụ rõ.

Schema đã được viết để review, chưa áp dụng lên Supabase. Cần thực thi và kiểm thử trên database test riêng trước khi sử dụng cho dữ liệu dự án; các lựa chọn mới trong ADR 0004 cần được duyệt khi triển khai.
