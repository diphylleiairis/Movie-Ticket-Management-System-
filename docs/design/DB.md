# Bản nháp thiết kế cơ sở dữ liệu

**Trạng thái:** Đề xuất để thảo luận, chưa phải schema đã được phê duyệt.

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

Repo hiện có cấu hình PostgreSQL + JPA, nhưng chưa có entity hay migration định nghĩa các bảng nghiệp vụ trong mã nguồn đã khảo sát. Flyway được quy định trong kiến trúc, nhưng chưa được khai báo trong `backend/pom.xml`.

Các bảng dưới đây thuộc tám module: Identity, Catalog, Venue, Scheduling, Booking, Payment, Tickets và Ticket Validation. Mỗi module sở hữu dữ liệu của mình; module khác sử dụng application contract thay vì truy cập trực tiếp repository hoặc bảng của module đó.

## 2. Danh sách bảng đề xuất

Quy ước:

- Mỗi bảng có khóa chính `id`, trừ bảng nối có thể sử dụng khóa chính ghép.
- Các cột `*_id` là khóa ngoại; `used_by` tham chiếu tài khoản nhân viên.
- Có thể bổ sung `created_at`, `updated_at` cho những bảng cần theo dõi thời điểm tạo và cập nhật.
- Tên bảng, cột và cách tách bảng là đề xuất thiết kế; kiểu dữ liệu và ràng buộc SQL sẽ được chốt ở bước thiết kế schema.

| STT | Module sở hữu | Bảng đề xuất | Mục đích | Cột chính dự kiến |
|---:|---|---|---|---|
| 1 | Identity | `users` | Tài khoản Customer, Admin và Cinema Staff | `email`, `password_hash`, `full_name`, `phone`, `role`, `status`, `email_verified_at` |
| 2 | Identity | `email_verifications` | Xác thực email đăng ký và email mới khi đổi email | `user_id`, `target_email`, `purpose`, `token_hash`, `expires_at`, `consumed_at` |
| 3 | Catalog | `movies` | Thông tin phim | `slug`, `title`, `description`, `duration_minutes`, `age_rating`, `poster_url`, `release_date`, `status` |
| 4 | Catalog | `genres` | Danh mục thể loại | `name`, `slug` |
| 5 | Catalog | `movie_genres` | Quan hệ nhiều–nhiều giữa phim và thể loại | `movie_id`, `genre_id` |
| 6 | Venue | `locations` | Các khu vực Việt Nam được cấu hình | `name`, `code` |
| 7 | Venue | `cinemas` | Rạp thuộc một khu vực | `location_id`, `name`, `address` |
| 8 | Venue | `seat_layouts` | Mẫu sơ đồ ghế dùng lại cho nhiều phòng | `name`, `description` |
| 9 | Venue | `seat_layout_positions` | Các vị trí ghế trong mẫu sơ đồ | `seat_layout_id`, `seat_code`, `row_label`, `column_number`, `position_x`, `position_y` |
| 10 | Venue | `halls` | Phòng chiếu thuộc rạp, được gán mẫu sơ đồ | `cinema_id`, `seat_layout_id`, `name`, `layout_locked_at` |
| 11 | Venue | `seats` | Ghế vật lý của từng phòng | `hall_id`, `seat_layout_position_id`, `seat_code` |
| 12 | Scheduling | `showtimes` | Suất chiếu của phim trong một phòng | `movie_id`, `hall_id`, `starts_at`, `ends_at`, `base_price`, `currency`, `status` |
| 13 | Booking | `showtime_seats` | Trạng thái hiện tại của từng ghế theo suất chiếu | `showtime_id`, `seat_id`, `state`, `booking_id`, `hold_expires_at` |
| 14 | Booking | `bookings` | Giao dịch đặt vé của khách hàng | `customer_id`, `showtime_id`, `status`, `hold_started_at`, `hold_expires_at`, `total_amount`, `currency`, `confirmed_at` |
| 15 | Booking | `booking_seats` | Danh sách ghế đã yêu cầu và giá tại thời điểm đặt | `booking_id`, `showtime_id`, `seat_id`, `unit_price` |
| 16 | Payment | `payment_attempts` | Các lần thanh toán của một booking | `booking_id`, `provider`, `provider_reference`, `idempotency_key`, `amount`, `currency`, `status`, `is_active` |
| 17 | Payment | `payment_events` | Lưu kết quả callback, truy vấn trạng thái và đối soát | `payment_attempt_id`, `provider_event_id`, `event_type`, `reported_status`, `verification_status`, `received_at`, `processed_at` |
| 18 | Tickets | `tickets` | Vé được phát hành sau thanh toán thành công | `booking_id`, `qr_token_hash`, `customer_name_snapshot`, `ticket_details_snapshot`, `issued_at`, `used_at`, `used_by` |

### Các bảng bổ sung tùy cách triển khai

| Module sở hữu | Bảng | Khi cần | Cột chính dự kiến |
|---|---|---|---|
| Payment | `payment_reversals` | Nên tách để theo dõi yêu cầu hoàn tiền/hủy giao dịch và retry khi thanh toán thành công muộn nhưng không thể cấp vé | `payment_attempt_id`, `operation_type`, `reason`, `amount`, `status`, `provider_reference`, `idempotency_key` |
| Ticket Validation | `ticket_validation_logs` | Khi cần lịch sử các lần quét QR, gồm cả lần bị từ chối | `ticket_id`, `staff_id`, `expected_showtime_id`, `result`, `scanned_at` |
| Identity | `password_reset_tokens` | Release 2: đặt lại mật khẩu | `user_id`, `token_hash`, `expires_at`, `consumed_at` |
| Identity | Bảng lưu session | Nếu chọn lưu phiên đăng nhập trong PostgreSQL; tên bảng và cấu trúc phụ thuộc cơ chế session | Tài khoản, mã phiên, thời điểm hết hạn |

`ticket_validation_logs.ticket_id` có thể rỗng khi QR không tham chiếu đến vé tồn tại. Dù không tách `payment_reversals`, hệ thống vẫn phải lưu được bản ghi kiểm toán về thanh toán muộn và quá trình hoàn tiền/hủy giao dịch.

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
- Quan hệ Booking–Ticket tạm đề xuất một–một, chỉ tạo Ticket sau khi Booking được xác nhận. Đây là giả định cần chốt trước khi viết schema.

## 5. Ràng buộc nghiệp vụ cần bảo toàn

### Identity

- Email là định danh đăng nhập duy nhất của Customer. Tài khoản đăng ký mới chưa được hoạt động bình thường trước khi xác thực email.
- Khi đổi email, `users.email` vẫn giữ email đã xác thực hiện tại; email mới nằm trong yêu cầu xác thực cho đến khi xác thực thành công và kiểm tra lại tính duy nhất.
- Đổi email phải giữ nguyên Customer identity và quan hệ Booking/Ticket. Password reset sử dụng email đã xác thực hiện tại.
- Chỉ lưu password hash và token hash; Admin/Staff được provision hoặc seed, không tạo qua đăng ký công khai.

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

- Một Booking có nhiều Payment Attempts nhưng chỉ một attempt active. Cần ràng buộc duy nhất có điều kiện và transaction khi tạo/retry attempt.
- Idempotency áp dụng theo từng Payment Attempt. Callback trùng không được tạo thêm xác nhận hoặc Ticket.
- Callback phải được kiểm tra chữ ký/xác thực, reference, amount, currency và trạng thái trước khi thay đổi Booking/Seat/Ticket.
- Xử lý rõ `SUCCESS`, `FAILED`, `CANCELLED`, `UNKNOWN`, `PENDING` và late `SUCCESS`. `UNKNOWN` yêu cầu truy vấn trạng thái provider; không tự coi là thất bại.
- Late `SUCCESS` chỉ được xác nhận khi toàn bộ ghế yêu cầu còn `AVAILABLE`, kiểm tra nguyên tử trong transaction. Nếu không thể cấp vé, phải lưu kết quả và theo dõi xử lý với provider.
- Việc xác nhận Booking, chuyển ghế sang `BOOKED` và phát hành Ticket phải nhất quán. Mọi thao tác liên module đi qua application contract.
- Không lưu thông tin thẻ hoặc tài khoản ngân hàng thô trong các bảng này.

### Tickets và Ticket Validation

- Ticket chỉ phát hành sau thanh toán thành công đã được xác thực. Snapshot phải đủ để hiển thị Movie, Cinema, Showtime, Seats, Customer name, Booking ID và Price tại thời điểm phát hành; QR được cung cấp qua cơ chế phát hành đã chọn.
- Cách tạo lại QR khi khách mở vé cần được thiết kế rõ; `qr_token_hash` phục vụ tra cứu/xác minh và không đủ để khôi phục token gốc.
- Ticket Validation cập nhật trạng thái đã dùng thông qua application contract của Tickets. Kiểm tra đúng showtime và đánh dấu `used_at` nguyên tử để ngăn sử dụng lại.
- Ticket sắp tới luôn được hiển thị; lịch sử quá khứ có cửa sổ hiển thị 30 ngày. Không xóa bản ghi chỉ vì quá 30 ngày.
- Customer không được hủy Ticket đã mua thành công.

## 6. Các quyết định cần chốt trước khi viết schema

1. Một Ticket/QR cho cả Booking hay một Ticket/QR cho từng ghế.
2. Cơ chế phát hành và hiển thị lại QR khi khách mở My Tickets.
3. Danh sách trạng thái Booking, tài khoản và suất chiếu; giá trị Payment/Seat phải tuân theo quy tắc hiện hành.
4. Cách lưu phiên đăng nhập và có cần bảng session trong PostgreSQL hay không.
5. Chính sách giá vé: giá cố định theo suất chiếu hay cần thêm loại ghế và quy tắc giá.
6. Vị trí lưu định dạng chiếu, âm thanh, ngôn ngữ và các nhãn biên tập của giao diện demo.
7. Payment Provider cụ thể, reference/event ID được hỗ trợ, cơ chế đối soát và hoàn tiền/hủy giao dịch.
8. Có tách `payment_reversals` và `ticket_validation_logs` thành bảng riêng hay không; vẫn phải bảo toàn yêu cầu kiểm toán và chống sử dụng vé lại.

Bản nháp chỉ mô tả đề xuất dữ liệu. Các quyết định kiến trúc hoặc dữ liệu khó đảo ngược cần được phê duyệt và ghi ADR trước khi triển khai migration.
