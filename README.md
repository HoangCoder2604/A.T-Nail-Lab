# A.T Nail Lab — Firebase Booking Integration

Bản này được nâng cấp trực tiếp từ source A.T Nail Lab đã deploy Vercel của bạn. UI/ảnh/animation gốc được giữ lại, chỉ bổ sung hệ thống booking thật bằng Firebase, trang admin và flow Messenger.

## 1. Chức năng đã thêm

- Booking lưu vào Firebase Firestore trước khi mở Messenger.
- Sinh mã lịch dạng `ATN-YYMMDD-XXXXXXXX`.
- Khách kiểm tra trạng thái tại `/check-booking` bằng mã lịch + số điện thoại.
- Admin đăng nhập tại `/admin/login` bằng Firebase Authentication.
- Admin dashboard tại `/admin`: xem, tìm, lọc, xác nhận, hoàn thành, hủy lịch.
- Chống đặt trùng bằng `bookingSlots` + Firestore transaction.
- Hai khách bấm cùng một slot gần như đồng thời: chỉ một transaction được commit.
- Slot lịch là mỗi 30 phút (`:00` / `:30`). Hai lịch cách đúng 30 phút được chấp nhận.
- Khi admin hủy lịch, slot được giải phóng để khách khác đặt lại.
- `vercel.json` đã có rewrite cho `/admin`, `/admin/login`, `/check-booking`.

## 2. Flow booking hiện tại

```text
Bấm Đặt lịch
  ↓
Kiểm tra input + slot 30 phút
  ↓
Firestore transaction
  ├─ bookings/{bookingCode}
  ├─ bookingSlots/{date_time}
  └─ bookingPublic/{hash}
  ↓
Hiện mã booking trên website
  ↓
Tự động sao chép mã lịch + thông tin khách
  ↓
Mở Messenger Page
  ↓
Khách Dán → Gửi
  ↓
Admin đối chiếu mã trên dashboard và phản hồi thủ công
```

Tab Messenger được mở ngay trong user gesture nhưng chỉ redirect vào Messenger sau khi Firebase commit thành công. Nếu Firebase báo trùng lịch hoặc lỗi, tab Messenger sẽ đóng và booking không được tạo dở dang.

## 3. Messenger Page A.T Nail Lab

Client env hiện dùng Facebook Page A.T Nail Lab:

```env
VITE_MESSENGER_MODE=page
VITE_MESSENGER_PAGE=61584573756566
```

Sau khi Firestore commit booking thành công, website sao chép toàn bộ thông tin và mở:

```text
https://m.me/61584573756566
```

Booking luôn được lưu trước khi chuyển khách sang Messenger. Nếu Messenger yêu cầu đăng nhập, dữ liệu lịch vẫn còn trên Firebase và dashboard.

## 4. Xác nhận qua Messenger thủ công

Hệ thống hiện không liên kết PSID và không tự gửi tin nhắn từ Page. Nội dung sau được tự động sao chép để khách dán vào Messenger:

```text
💅 A.T NAIL LAB - YÊU CẦU ĐẶT LỊCH

Mã lịch: ATN-YYMMDD-XXXXXXXX
Khách hàng: ...
Số điện thoại: ...
Dịch vụ: ...
Ngày: ...
Giờ: ...
Ghi chú: ...

Mình đã đặt lịch trên website. Nhờ A.T Nail Lab kiểm tra và xác nhận giúp mình nha 💕
```

Người quản lý Page nhận tin nhắn, tìm đúng mã trên dashboard rồi bấm **Xác nhận**, **Hủy** hoặc **Hoàn thành**. Việc phản hồi khách được thực hiện trực tiếp trong Messenger.

Các API webhook cũ vẫn được giữ trong source để có thể dùng lại sau này, nhưng mặc định bị tắt. Không đặt `MESSENGER_AUTOMATION_ENABLED=true` nếu muốn tiếp tục dùng cơ chế thủ công.

## 5. Firebase Web config

File `.env` trong bản ZIP đã được điền bằng Firebase Web config bạn cung cấp để test local.

`.env` bị `.gitignore`, vì vậy khi push GitHub nó sẽ không được commit. Trên Vercel cần tạo Environment Variables tương ứng:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_MESSENGER_MODE
VITE_MESSENGER_PAGE
```

## 6. Firestore Rules

Firebase Console → Firestore Database → Rules.

Copy toàn bộ file:

```text
firebase/firestore.rules
```

Paste và Publish.

Rules cho phép:

- public tạo booking hợp lệ;
- public chỉ get từng slot cụ thể, không list lịch;
- public tra cứu booking qua hash bookingCode + phone;
- chỉ UID có document `admins/{uid}` được đọc/update toàn bộ bookings.

## 7. Admin

Bạn đã tạo Firebase Auth user và document:

```text
admins/{FIREBASE_AUTH_UID}
```

Các field có thể là:

```text
email: admin email
name: Do Anh Thu
role: admin
```

Quyền admin thực tế dựa trên Document ID = Firebase Auth UID.

## 8. Chạy local

```bash
npm install
npm run dev
```

File `package-lock.json` cũ đã được bỏ khỏi ZIP vì package mới thêm Firebase + React Router. `npm install` sẽ tự sinh lockfile mới đúng dependency.

Test:

1. Đặt lịch 14:00.
2. Xem Firestore: `bookings`, `bookingSlots`, `bookingPublic` được tạo.
3. Thử đặt lại cùng ngày 14:00 → phải báo trùng.
4. 14:30 → được phép vì cách đúng 30 phút.
5. Mở `/admin/login` và đăng nhập admin.
6. Xác nhận booking → status Firebase thành `CONFIRMED`.
7. Mở `/check-booking`, nhập mã + số điện thoại → thấy trạng thái mới.

## 9. Deploy Vercel

Sau khi push GitHub, vào Vercel → Project → Settings → Environment Variables và thêm các `VITE_FIREBASE_*` + Messenger env. Sau đó Redeploy.

Build command:

```text
npm run build
```

Output:

```text
dist
```

## Admin realtime + push notification (FCM)

### Realtime dashboard
`/admin` now subscribes to Firestore with `onSnapshot()`. New bookings appear without reload, the dashboard shows a Realtime indicator, a pending/new-booking badge, and an in-page alert/chime.

### Web Push setup
1. Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates -> Generate key pair.
2. Copy the public key into `VITE_FIREBASE_VAPID_KEY` locally and in Vercel Environment Variables.
3. Create/download a Firebase Admin service account key from Firebase Console -> Project settings -> Service accounts -> Generate new private key. Do not put the JSON file in `src` or commit it.
4. Add these **server-only** Vercel variables:
   - `FIREBASE_PROJECT_ID=at-nail-lab`
   - `FIREBASE_CLIENT_EMAIL=<service account client_email>`
   - `FIREBASE_PRIVATE_KEY=<service account private_key>`
5. Deploy/redeploy Vercel.
6. Sign in `/admin` on each admin device and press **Bật thông báo đẩy** once.

The push flow is:
`booking transaction -> /api/notify-new-booking -> Firebase Admin FCM -> admin device`.
Clicking a notification opens `/admin?booking=<BOOKING_CODE>` and highlights/filters that booking.

### Local testing note
`npm run dev` runs Vite only, not Vercel serverless `/api` routes. Realtime Firestore still works locally. For end-to-end push API testing use a deployed Vercel URL or `vercel dev` after configuring server environment variables.

### Files added for push
- `src/services/adminNotificationService.js`
- `public/firebase-messaging-sw.js`
- `api/admin-push-register.js`
- `api/notify-new-booking.js`
