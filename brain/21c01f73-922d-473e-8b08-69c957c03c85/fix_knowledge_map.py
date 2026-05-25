# -*- coding: utf-8 -*-
import io
import sys

# Reconfigure stdout to UTF-8
if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

filepath = r"C:\Users\PC\OneDrive\Desktop\smartcare-prep-web\src\views\KnowledgeMap.tsx"

# 25 nodes mới sạch sẽ của SmartCare
smart_nodes_code = """  // Định nghĩa 25 nodes bám sát "Hành trình hệ thống"
  const staticNodes: KnowledgeNode[] = [
    // --- STAGE 1: USER ACTIONS & HEALTH (user) ---
    {
      id: "nutri-profile",
      label: "Hồ Sơ Sức Khỏe",
      subLabel: "Mifflin-St Jeor & TDEE",
      category: "user",
      stage: 1,
      x: 70,
      y: 100,
      w: 160,
      h: 46,
      summary: "Xác lập chỉ số sức khỏe của người bệnh, làm cơ sở khoa học để cá nhân hóa chỉ số năng lượng tiêu hao hằng ngày.",
      technicalDetails: "Sử dụng công thức Mifflin-St Jeor để tính năng lượng chuyển hóa cơ bản BMR: BMR = 10*Weight(kg) + 6.25*Height(cm) - 5*Age(y) + S (Nam S=+5, Nữ S=-161). Sau đó nhân hệ số PAL (từ 1.2 đến 1.725) để tìm năng lượng tiêu hao TDEE nhằm gợi ý chế độ ăn uống cho người bệnh.",
      files: [{ name: "user.model.js", path: "d:/temp_smartcare/server/src/models/user.model.js" }],
      qaList: [
        {
          question: "Tại sao nhóm chọn Mifflin-St Jeor thay vì Harris-Benedict cũ?",
          answer: "Dạ, theo nghiên cứu lâm sàng của Hiệp hội Dinh dưỡng Hoa Kỳ (ADA), công thức Mifflin-St Jeor có sai số thấp nhất (chỉ khoảng 10%) đối với người hiện đại, trong khi Harris-Benedict (xây dựng từ 1919) có xu hướng tính thừa calo từ 5% đến 15%, không phù hợp cho chế độ kiểm soát calo của bệnh nhân."
        },
        {
          question: "Làm sao xử lý việc người bệnh tự đánh giá sai lệch hệ số PAL?",
          answer: "Dạ, hệ thống hỗ trợ Caregiver và Patient theo dõi nhật ký cân nặng và các Health Logs định kỳ. Nếu cân nặng thực tế thay đổi lệch quá nhiều so với tính toán lý thuyết, hệ thống sẽ đề xuất tự động hiệu chỉnh hệ số PAL thêm 0.1 để khớp thực tế."
        }
      ],
      rubricMapping: "Tiêu chí Phân tích yêu cầu (Chương 2) & Thiết kế thuật toán (Chương 3)"
    },
    {
      id: "manual-diary",
      label: "Lịch Thuốc & Nhắc Nhở",
      subLabel: "Notifee Local Reminders",
      category: "user",
      stage: 1,
      x: 70,
      y: 220,
      w: 160,
      h: 46,
      summary: "Thiết lập lịch uống thuốc hàng ngày hoặc cách ngày, tự động tạo nhắc nhở và lên lịch thông báo cục bộ.",
      technicalDetails: "Sử dụng @notifee/react-native để lên lịch nhắc nhở uống thuốc tự động trên thiết bị di động tại 4 thời điểm: 15 phút, 10 phút, 5 phút trước và đúng giờ uống thuốc. Tự động kiểm tra nhắc nhở quá hạn 1 giờ chưa uống để chuyển trạng thái sang Đã quên.",
      files: [{ name: "notification.service.ts", path: "d:/temp_smartcare/mobile/src/services/notification.service.ts" }],
      qaList: [
        {
          question: "Cơ chế hoạt động của việc thông báo nhắc nhở uống thuốc nhiều đợt?",
          answer: "Dạ, khi thêm hoặc cập nhật thuốc mới, hệ thống tự động sinh các trigger notification cục bộ thông qua Notifee tương ứng với các khung giờ uống thuốc và thời gian nhắc nhở trước (15m, 10m, 5m). Khi người dùng đánh dấu 'Đã uống', app sẽ gọi `notifee.cancelNotification` để hủy các thông báo còn lại trong đợt."
        },
        {
          question: "Cách xử lý các thuốc uống cách ngày trong database?",
          answer: "Dạ, trong schema `Medication` ta lưu trường `frequency: 'every_other_day'` và `startDate`. Khi sinh các reminders cho ngày hiện tại, hệ thống sử dụng thuật toán tính khoảng cách số ngày chênh lệch chẵn lẻ giữa ngày hiện tại và `startDate` để quyết định có sinh reminder uống thuốc hay không."
        }
      ],
      rubricMapping: "Tiêu chí Lập trình nghiệp vụ di động và Quản lý sự kiện (Chương 4)"
    },
    {
      id: "yolo-scan",
      label: "Cảm Biến Té Ngã",
      subLabel: "Accelerometer Fall Detection",
      category: "user",
      stage: 1,
      x: 70,
      y: 340,
      w: 160,
      h: 46,
      summary: "Phát hiện té ngã của người bệnh bằng cảm biến gia tốc trên điện thoại và gửi cảnh báo khẩn cấp.",
      technicalDetails: "Sử dụng thư viện react-native-sensors đọc liên tục dữ liệu từ Accelerometer (gia tốc kế) theo chu kỳ 50ms. Lọc thông dải (Bandpass Filter) để khử nhiễu nhiễu rung thường, tính độ lớn gia tốc tổng hợp R = sqrt(ax^2 + ay^2 + az^2). Nếu R vượt ngưỡng rơi tự do (gần 0) sau đó tăng vọt đột ngột (> 3.5g) và có trạng thái bất động sau đó, hệ thống sẽ kích hoạt bộ đếm thời gian chờ 30 giây để người dùng bấm hủy. Nếu không hủy, app sẽ tự lấy vị trí GPS từ @react-native-community/geolocation và gửi request SOS khẩn cấp kèm tọa độ đến Caregiver.",
      files: [{ name: "useFallDetection.ts", path: "d:/temp_smartcare/mobile/src/hooks/useFallDetection.ts" }],
      qaList: [
        {
          question: "Thuật toán phát hiện té ngã hoạt động như thế nào và dựa trên những pha nào?",
          answer: "Dạ, thuật toán trải qua 3 pha chính: 1. Pha rơi tự do (Free Fall) khi gia tốc tổng hợp R giảm gần về 0. 2. Pha va chạm (Impact) khi gia tốc tăng vọt đột ngột vượt ngưỡng va chạm (> 3.5g). 3. Pha nằm im bất động (Inactivity) khi gia tốc duy trì ổn định ở mức ~1.0g (trọng lực trái đất) không có dao động lớn trong 5 giây. Đạt cả 3 pha này mới kích hoạt cảnh báo."
        },
        {
          question: "Làm sao để hạn chế báo động giả khi người dùng chỉ đánh rơi điện thoại?",
          answer: "Dạ, nhóm đã thiết kế pha thứ 3 (Pha nằm im bất động) và bộ đếm thời gian chờ 30 giây (Countdown). Khi điện thoại rơi xuống đất nhưng người dùng nhặt lên di chuyển bình thường, gia tốc kế sẽ có dao động lớn nên pha bất động bị hủy, hoặc người dùng có thể chủ động bấm 'Hủy SOS' trên màn hình cảnh báo."
        }
      ],
      rubricMapping: "Tiêu chí Ứng dụng cảm biến phần cứng & Thuật toán xử lý tín hiệu (Chương 3 & 4)"
    },
    {
      id: "voice-command",
      label: "Điều Khiển Giọng Nói",
      subLabel: "@react-native-voice/voice & NLP",
      category: "user",
      stage: 1,
      x: 70,
      y: 460,
      w: 160,
      h: 46,
      summary: "Ghi nhận lệnh giọng nói tiếng Việt của người dùng để thực hiện các thao tác nhanh (ví dụ: 'tôi vừa uống thuốc A', 'nhắc tôi uống nước').",
      technicalDetails: "Sử dụng thư viện @react-native-voice/voice để thực hiện nhận diện giọng nói trực tiếp trên thiết bị (Speech-to-Text). Văn bản tiếng Việt thu được sẽ gửi lên Backend Web API. Backend chuyển tiếp sang OpenAI GPT API để phân tích ý định (Intent Classification) và bóc tách thực thể (Named Entity Recognition - NER) như tên thuốc, hành động, từ đó trả về JSON cấu trúc để Mobile Client thực hiện.",
      files: [{ name: "VoiceCommandButton.tsx", path: "d:/temp_smartcare/mobile/src/components/VoiceCommandButton.tsx" }],
      qaList: [
        {
          question: "Tại sao nhóm sử dụng @react-native-voice/voice thay vì gọi API âm thanh thẳng lên OpenAI Whisper?",
          answer: "Dạ, @react-native-voice/voice sử dụng bộ máy Speech-to-Text tích hợp sẵn của hệ điều hành (Google Speech Services trên Android / Apple Speech trên iOS). Cơ chế này xử lý hoàn toàn miễn phí, có độ trễ cực thấp (< 300ms) và tiết kiệm băng thông mạng của thiết bị di động so với việc upload file âm thanh."
        },
        {
          question: "Cách bóc tách ý định (Intent) từ văn bản tiếng Việt của AI hoạt động ra sao?",
          answer: "Dạ, Backend gửi văn bản kèm System Prompt cấu trúc chặt chẽ sang OpenAI, yêu cầu phân loại thành 3 Intent: `RECORD_MEDICATION` (uống thuốc), `RECORD_HEALTH_LOG` (ghi nhật ký calo/vận động), và `SOS_ALERT`. AI trả về JSON chứa Intent và tham số tương ứng như `{ \"intent\": \"RECORD_MEDICATION\", \"medicationName\": \"Paracetamol\" }` giúp hệ thống thực thi chính xác."
        }
      ],
      rubricMapping: "Tiêu chí Xử lý ngôn ngữ tự nhiên (NLP) & Giao tiếp thiết bị di động (Chương 4)"
    },
    {
      id: "auth-forgot",
      label: "Xác Thực & OTP",
      subLabel: "JWT Auth & Brevo Mailer",
      category: "user",
      stage: 1,
      x: 70,
      y: 580,
      w: 160,
      h: 46,
      summary: "Đăng ký, đăng nhập tài khoản bằng số điện thoại, phân quyền vai trò Patient/Caregiver, và gửi OTP để kích hoạt/quên mật khẩu.",
      technicalDetails: "Sử dụng bcryptjs để hash mật khẩu an toàn khi lưu trữ. Tạo chữ ký số JWT token (jsonwebtoken) chứa UID và vai trò (role) để gửi về Mobile Client qua tiêu đề Authorization Bearer. Sử dụng mã OTP 4 chữ số gửi qua email (Brevo Mailer / SMTP) có hiệu lực 5 phút để kích hoạt tài khoản hoặc đặt lại mật khẩu.",
      files: [{ name: "auth.controller.js", path: "d:/temp_smartcare/server/src/controllers/auth.controller.js" }],
      qaList: [
        {
          question: "Tại sao chọn JWT Auth thay vì Session Cookie cho ứng dụng di động?",
          answer: "Dạ, JWT (JSON Web Token) hoạt động stateless, không lưu session trên server. Mobile client lưu JWT token trong bộ nhớ an toàn và gửi chèn vào header Authorization ở mỗi request, giúp server dễ dàng mở rộng (scale out) và tránh lỗi CORS chéo nền tảng."
        },
        {
          question: "Tại sao tài khoản phải qua bước kích hoạt OTP trước khi sử dụng?",
          answer: "Dạ, đây là cơ chế bảo mật xác thực danh tính bắt buộc nhằm ngăn chặn việc đăng ký tài khoản rác hàng loạt (spam), đồng thời đảm bảo số điện thoại hoặc email liên lạc của người bệnh và người chăm sóc (Caregiver) là chính xác tuyệt đối để nhận thông báo khẩn cấp."
        }
      ],
      rubricMapping: "Tiêu chí Bảo mật hệ thống & Giao tiếp dịch vụ bên thứ ba (Chương 4)"
    },
 
    // --- STAGE 2: MOBILE CLIENT APP (mobile) ---
    {
      id: "mobile-state",
      label: "Lưu Trữ Cục Bộ",
      subLabel: "AsyncStorage Session",
      category: "mobile",
      stage: 2,
      x: 320,
      y: 160,
      w: 160,
      h: 46,
      summary: "Quản lý trạng thái phiên đăng nhập, lịch thuốc, và nhật ký sức khỏe offline trên thiết bị.",
      technicalDetails: "Sử dụng @react-native-async-storage/async-storage để lưu trữ an toàn JWT token, profile người dùng và hàng đợi đồng bộ hóa dữ liệu ngoại tuyến (Offline Sync Queue). Kết hợp với React Context để quản lý state toàn ứng dụng, giúp re-render tối ưu các tab.",
      files: [{ name: "AuthContext.tsx", path: "d:/temp_smartcare/mobile/src/contexts/AuthContext.tsx" }],
      qaList: [
        {
          question: "Tại sao nhóm dùng React Context thay vì Redux Toolkit?",
          answer: "Dạ, React Context là giải pháp quản lý state tích hợp sẵn của React, rất gọn nhẹ, không sinh boilerplate code rườm rà. Với ứng dụng SmartCare, dữ liệu state di động tập trung chính ở phiên đăng nhập và thông tin liên kết Caregiver, do đó React Context là đủ đáp ứng và tối ưu hiệu năng."
        }
      ],
      rubricMapping: "Tiêu chí Kiến trúc mã nguồn Client di động (Chương 3)"
    },
    {
      id: "mobile-api",
      label: "API Axios Interceptor",
      subLabel: "JWT Bearer & Auto-Retry",
      category: "mobile",
      stage: 2,
      x: 320,
      y: 280,
      w: 160,
      h: 46,
      summary: "Tự động gán token JWT vào header của request và xử lý retry tự động khi gặp lỗi kết nối mạng.",
      technicalDetails: "Cấu hình Axios instance với request interceptor để tự động chèn header 'Authorization: Bearer <token>'. Thiết lập response interceptor để bắt lỗi mạng hoặc HTTP 401. Hỗ trợ offline queue: nếu mất mạng, các API ghi nhận dữ liệu sẽ được lưu vào hàng đợi AsyncStorage và tự động phát lại (retry) tuần tự khi có mạng trở lại.",
      files: [{ name: "api-wrapper.ts", path: "d:/temp_smartcare/mobile/src/utils/api-wrapper.ts" }],
      qaList: [
        {
          question: "Cơ chế giải quyết xung đột khi đồng bộ dữ liệu offline lên server?",
          answer: "Dạ, hàng đợi offline queue lưu trữ các thao tác kèm nhãn thời gian (timestamp). Khi thiết bị có mạng trở lại, interceptor gửi tuần tự các request theo nguyên tắc FIFO (First In First Out). Server sử dụng timestamp do client gửi lên để ghi đè hoặc hợp nhất dữ liệu nhật ký sức khỏe thay vì lấy thời gian của server."
        }
      ],
      rubricMapping: "Tiêu chí Xử lý bất đồng bộ và kết nối bảo mật API (Chương 4)"
    },
    {
      id: "mobile-hardware",
      label: "Giao Tiếp Thiết Bị",
      subLabel: "Track Player & GPS SOS",
      category: "mobile",
      stage: 2,
      x: 320,
      y: 400,
      w: 160,
      h: 46,
      summary: "Gọi các APIs phần cứng của di động để phát nhạc thư giãn, lấy tọa độ GPS khẩn cấp và chụp đơn thuốc.",
      technicalDetails: "Sử dụng react-native-track-player để phát nhạc thư giãn Chill, Rain, Forest, Sea chạy ngầm (background audio playback). Sử dụng @react-native-community/geolocation để lấy tọa độ GPS thời gian thực khi có tín hiệu SOS từ cảm biến té ngã. Sử dụng react-native-image-picker để gọi camera chụp ảnh đơn thuốc gửi lên AI.",
      files: [{ name: "useAudioPlayer.ts", path: "d:/temp_smartcare/mobile/src/hooks/useAudioPlayer.ts" }],
      qaList: [
        {
          question: "Làm thế nào để ứng dụng có thể phát nhạc nền ngay cả khi tắt màn hình di động?",
          answer: "Dạ, react-native-track-player tích hợp sâu dịch vụ chạy ngầm cấp hệ điều hành (Android Foreground Service & iOS Background Audio Capabilities). Nhóm phải cấu hình quyền `BACKGROUND_modes` trong Info.plist của iOS và cấp quyền chạy ngầm trong AndroidManifest.xml."
        }
      ],
      rubricMapping: "Tiêu chí Lập trình tương tác thiết bị phần cứng di động (Chương 4)"
    },
    {
      id: "mobile-eas",
      label: "EAS Build & Env",
      subLabel: "Android APK Production",
      category: "mobile",
      stage: 2,
      x: 320,
      y: 520,
      w: 160,
      h: 46,
      summary: "Đóng gói ứng dụng React Native thành file cài đặt di động (.apk) và phân tách các cấu hình API endpoint môi trường.",
      technicalDetails: "Cấu hình eas.json và metro.config.js để phân tách môi trường phát triển (development) và sản xuất (production). EAS CLI biên dịch mã nguồn TypeScript thành file binary .apk để cài đặt và chạy thử nghiệm trên thiết bị Android thực tế.",
      files: [{ name: "eas.json", path: "d:/temp_smartcare/mobile/eas.json" }],
      qaList: [
        {
          question: "Tại sao nhóm phân tách biến môi trường khi đóng gói ứng dụng?",
          answer: "Dạ, để tránh rò rỉ endpoint API kiểm thử của Localhost hoặc Staging ra file build Production, đồng thời đảm bảo khi build release app sẽ tự động trỏ về domain HTTPS chính thức chạy trên VPS Ubuntu của SmartCare."
        }
      ],
      rubricMapping: "Tiêu chí Quy trình phát hành & Đóng gói sản phẩm di động (Chương 5)"
    },
 
    // --- STAGE 3: BACKEND WEB API (backend) ---
    {
      id: "back-controller",
      label: "Express API Router",
      subLabel: "JWT & Zod Verification",
      category: "backend",
      stage: 3,
      x: 580,
      y: 160,
      w: 160,
      h: 46,
      summary: "Tiếp nhận các request HTTP, xác thực JWT và kiểm tra tính hợp lệ dữ liệu đầu vào bằng Zod trước khi xử lý.",
      technicalDetails: "Tích hợp middleware xác thực JWT ở tầng router Express để giải mã token JWT, đưa thông tin user (req.user) vào request context. Sử dụng thư viện Zod để validate schema dữ liệu đầu vào (body, query, params) trước khi chuyển tiếp vào controller, trả về lỗi HTTP 400 rõ ràng nếu sai cấu trúc.",
      files: [{ name: "validate.js", path: "d:/temp_smartcare/server/src/middleware/validate.js" }],
      qaList: [
        {
          question: "Tại sao nhóm chọn Zod thay vì validate thủ công bằng if-else?",
          answer: "Dạ, Zod cung cấp cơ chế khai báo schema mạnh mẽ, hỗ trợ suy luận kiểu dữ liệu TypeScript (Type Inference), tự động bóc tách các trường rác không khai báo, và xuất ra thông báo lỗi chi tiết định dạng JSON giúp Frontend hiển thị trực quan cho người dùng."
        }
      ],
      rubricMapping: "Tiêu chí Thiết kế Web Service & Bảo mật Endpoint API (Chương 3 & 4)"
    },
    {
      id: "back-service",
      label: "Tầng Nghiệp Vụ & Proxy",
      subLabel: "Business Logic & PDFkit",
      category: "backend",
      stage: 3,
      x: 580,
      y: 280,
      w: 160,
      h: 46,
      summary: "Xử lý các nghiệp vụ tính toán sức khỏe, liên kết Caregiver-Patient, xuất báo cáo PDF và làm proxy bảo mật cho OpenAI.",
      technicalDetails: "Chứa toàn bộ logic nghiệp vụ cốt lõi: phê duyệt liên kết Caregiver bằng mã 6 chữ số, tính tỷ lệ tuân thủ thuốc 7 ngày. Tích hợp thư viện pdfkit để tạo và vẽ trực tiếp biểu đồ, bảng dữ liệu xuất báo cáo sức khỏe PDF. Đóng vai trò proxy gọi OpenAI API bằng cách gán key hệ thống an toàn ở server.",
      files: [{ name: "report.controller.js", path: "d:/temp_smartcare/server/src/controllers/report.controller.js" }],
      qaList: [
        {
          question: "Tại sao phải thiết lập Backend làm Proxy trung gian gọi OpenAI?",
          answer: "Dạ, để bảo vệ API key OpenAI. Nếu gọi thẳng từ thiết bị di động, kẻ tấn công có thể decomplie ứng dụng lấy cắp API key để spam request trục lợi. Proxy qua Backend cũng giúp kiểm soát hạn mức (rate limit) và kiểm tra phân quyền người dùng trước khi gọi AI."
        }
      ],
      rubricMapping: "Tiêu chí Áp dụng Design Patterns và phân tách kiến trúc hệ thống (Chương 3)"
    },
    {
      id: "back-repo",
      label: "Mongoose Models",
      subLabel: "MongoDB ODM Relationships",
      category: "backend",
      stage: 3,
      x: 580,
      y: 400,
      w: 160,
      h: 46,
      summary: "Định nghĩa các schemas cơ sở dữ liệu phi quan hệ MongoDB thông qua Mongoose, thiết lập quan hệ giữa các tài liệu.",
      technicalDetails: "Sử dụng Mongoose ODM để ánh xạ các Javascript object thành các document MongoDB. Định nghĩa các schemas: User (gồm cả profile, mã liên kết), Medication, Reminder (lịch uống thuốc), HealthLog (calo, vận động, triệu chứng mức độ 1-10), CaregiverLink (lưu trạng thái pending/active).",
      files: [{ name: "medication.model.js", path: "d:/temp_smartcare/server/src/models/medication.model.js" }],
      qaList: [
        {
          question: "Làm thế nào để thiết lập liên kết quan hệ trong cơ sở dữ liệu NoSQL MongoDB?",
          answer: "Dạ, nhóm sử dụng cơ chế Schema.Types.ObjectId kết hợp thuộc tính `ref` của Mongoose để chỉ định liên kết ngoài giữa các bảng tài liệu (ví dụ: trường `userId` trong schema Medication tham chiếu đến model `User`), sau đó sử dụng hàm `.populate()` để tự động truy vấn lấy dữ liệu chi tiết khi cần."
        }
      ],
      rubricMapping: "Tiêu chí Lập trình hướng đối tượng & Thiết kế cơ sở dữ liệu (Chương 3 & 4)"
    },
    {
      id: "back-ops",
      label: "Fail-Fast & PM2 Health",
      subLabel: "Node.js Cluster Guardian",
      category: "backend",
      stage: 3,
      x: 580,
      y: 520,
      w: 160,
      h: 46,
      summary: "Thiết lập khởi động an toàn và giám sát trạng thái hoạt động của Node.js qua PM2 Cluster và Health check API.",
      technicalDetails: "Thiết lập cấu hình Fail-Fast tại app.js và server.js: ném lỗi fatal sập ngay tiến trình nếu thiếu biến môi trường quan trọng (MONGODB_URI, JWT_SECRET, OPENAI_API_KEY). Cung cấp API endpoint /healthz để PM2 hoặc balancer kiểm tra trạng thái kết nối database. PM2 chạy ở Cluster mode để tự động restart tiến trình bị sập.",
      files: [{ name: "app.js", path: "d:/temp_smartcare/server/src/app.js" }],
      qaList: [
        {
          question: "Tại sao nhóm áp dụng mô hình sập nhanh Fail-Fast khi khởi động?",
          answer: "Dạ, để tránh hiện tượng 'lỗi câm' (silent errors). Nếu server vẫn khởi động thành công khi thiếu credentials kết nối database, các API sau đó đều lỗi gây khó khăn cho việc tìm nguyên nhân. Sập ngay lập tức giúp quản trị viên hoặc script CI/CD phát hiện lỗi cấu hình ngay lúc deploy."
        }
      ],
      rubricMapping: "Tiêu chí Cấu hình độ tin cậy hệ thống & Vận hành sản xuất (Chương 5)"
    },
 
    // --- STAGE 4: AI CORE & STORAGE (ai_db) ---
    {
      id: "ai-yolo",
      label: "OpenAI Vision OCR",
      subLabel: "Prescription OCR Analysis",
      category: "ai_db",
      stage: 4,
      x: 840,
      y: 100,
      w: 160,
      h: 46,
      summary: "Sử dụng mô hình ngôn ngữ thị giác GPT-4o Vision để nhận diện chữ viết tay và trích xuất thông tin từ đơn thuốc.",
      technicalDetails: "Nhận tệp tin đơn thuốc từ người dùng, Backend gửi request đa phương tiện (Multipart) chứa ảnh sang OpenAI API (gpt-4o). Áp dụng prompt hướng dẫn trích xuất có cấu trúc (Structured Outputs): bóc tách tên thuốc, liều lượng, giờ uống, tần suất thành định dạng JSON JSON Schema chuẩn xác để Mobile Client điền tự động vào form.",
      files: [{ name: "ai.controller.js", path: "d:/temp_smartcare/server/src/controllers/ai.controller.js" }],
      qaList: [
        {
          question: "Làm thế nào để đảm bảo AI trả về đúng định dạng JSON có cấu trúc mong muốn?",
          answer: "Dạ, nhóm tận dụng tính năng 'Structured Outputs' mới của OpenAI API bằng cách truyền tham số `response_format` dạng JSON Schema nghiêm ngặt. Hệ thống ép buộc mô hình GPT-4o phải tuân thủ schema này, loại bỏ hoàn toàn các lỗi trả về chuỗi văn bản thừa thãi."
        },
        {
          question: "Nếu chữ viết tay của bác sĩ Việt Nam quá xấu, giải pháp dự phòng là gì?",
          answer: "Dạ, kết quả trích xuất tự động từ OpenAI chỉ là 'bản nháp gợi ý'. Hệ thống hiển thị một màn hình Form xác nhận chứa thông tin đã trích xuất, cho phép Patient hoặc Caregiver tự tay rà soát và chỉnh sửa lại liều lượng, giờ giấc trước khi lưu chính thức vào lịch nhắc nhở."
        }
      ],
      rubricMapping: "Tiêu chí Ứng dụng trí tuệ nhân tạo (AI/ML) & Suy luận mô hình thị giác (Chương 3 & 4)"
    },
    {
      id: "ai-gemini",
      label: "Trợ Lý Sức Khỏe AI",
      subLabel: "OpenAI Chat & Disclaimer",
      category: "ai_db",
      stage: 4,
      x: 840,
      y: 220,
      w: 160,
      h: 46,
      summary: "Tư vấn sức khỏe cá nhân hóa dựa trên lịch sử bệnh lý của người dùng, tự động đính kèm cảnh báo y tế.",
      technicalDetails: "Tích hợp OpenAI GPT-3.5/GPT-4o chat API. Sử dụng System Prompt để định vị trợ lý sức khỏe thông minh SmartCare, tự động chèn thông tin bệnh lý của người dùng (req.user.healthStatus) and lịch sử 5 tin nhắn gần nhất vào ngữ cảnh. Luôn đính kèm Disclaimer từ từ chối chẩn đoán điều trị y tế ở cuối câu trả lời ngắn dưới 100 từ.",
      files: [{ name: "ai.controller.js", path: "d:/temp_smartcare/server/src/controllers/ai.controller.js" }],
      qaList: [
        {
          question: "Làm sao chống hiện tượng ảo tưởng (hallucination) khi AI trả lời các câu hỏi y tế?",
          answer: "Dạ, nhóm đã thiết lập cấu hình tham số `temperature: 0.2` (mức sáng tạo thấp) để ép buộc AI đưa ra các thông tin khoa học chính xác nhất, đồng thời thiết lập System Prompt nghiêm ngặt cấm AI phỏng đoán thuốc điều trị và bắt buộc đính kèm câu khuyến cáo người bệnh thăm khám bác sĩ chuyên khoa ở cuối câu trả lời."
        }
      ],
      rubricMapping: "Tiêu chí Tích hợp mô hình ngôn ngữ lớn (LLM) & Thiết kế an toàn thông tin (Chương 4)"
    },
    {
      id: "db-supabase",
      label: "MongoDB Atlas Cloud",
      subLabel: "Compound Indexing",
      category: "ai_db",
      stage: 4,
      x: 840,
      y: 340,
      w: 160,
      h: 46,
      summary: "Cơ sở dữ liệu đám mây MongoDB lưu trữ toàn bộ dữ liệu ứng dụng, tối ưu hóa tốc độ truy vấn chỉ mục.",
      technicalDetails: "MongoDB Atlas Singapore. Tối ưu hóa truy vấn bằng Compound Index (Chỉ mục kép) trên bảng HealthLog gồm (userId, date) để tăng tốc độ lấy biểu đồ calo và triệu chứng trong ngày dưới 10ms. Thiết lập Single-field index trên Reminder để truy vấn danh sách thuốc uống hôm nay theo giờ.",
      files: [{ name: "healthLog.model.js", path: "d:/temp_smartcare/server/src/models/healthLog.model.js" }],
      qaList: [
        {
          question: "Tại sao nhóm thiết lập Compound Index (userId, date) trên HealthLog?",
          answer: "Dạ, vì trong nghiệp vụ thực tế, màn hình Dashboard của cả Patient và Caregiver liên tục thực hiện truy vấn tìm kiếm nhật ký sức khỏe theo điều kiện đồng thời: `userId` bằng ID người bệnh và `date` bằng ngày hiện tại. Thiết lập chỉ mục kép giúp MongoDB quét thẳng vào node dữ liệu cần tìm, không phải duyệt quét toàn bộ bảng (collection scan), tối ưu tốc độ truy vấn."
        }
      ],
      rubricMapping: "Tiêu chí Thiết kế cơ sở dữ liệu & Tối ưu hóa truy vấn (Chương 3 & 4)"
    },
    {
      id: "storage-r2",
      label: "Cloudinary Storage",
      subLabel: "Multer Upload Stream",
      category: "ai_db",
      stage: 4,
      x: 840,
      y: 460,
      w: 160,
      h: 46,
      summary: "Lưu trữ và xử lý tối ưu hình ảnh đơn thuốc, ảnh đại diện của người bệnh trên Cloudinary.",
      technicalDetails: "Sử dụng middleware multer cấu hình memoryStorage để bắt luồng ảnh nhị phân từ Mobile. Backend gọi trực tiếp API Cloudinary upload stream để đẩy ảnh lên cloud mà không ghi file tạm ra đĩa cứng của VPS. Lưu URL ảnh bảo mật HTTPS trả về vào MongoDB.",
      files: [{ name: "cloudinary.js", path: "d:/temp_smartcare/server/src/config/cloudinary.js" }],
      qaList: [
        {
          question: "Lợi ích của việc upload stream bằng memoryStorage so với lưu file tạm ra đĩa cứng?",
          answer: "Dạ, việc ghi file tạm ra ổ đĩa của VPS rồi đọc lại để upload lên Cloudinary sẽ gây ra tắc nghẽn I/O ổ đĩa khi có nhiều người dùng đồng thời, làm mài mòn SSD và tốn công dọn dẹp file rác. Sử dụng bộ nhớ đệm (RAM) giúp tối ưu hóa tốc độ và bảo mật, tránh lưu file nhạy cảm trên máy chủ."
        }
      ],
      rubricMapping: "Tiêu chí Thiết kế kiến trúc lưu trữ & Tối ưu luồng dữ liệu (Chương 3 & 4)"
    },
 
    // --- STAGE 5: PRODUCTION CLOUD (deploy) ---
    {
      id: "deploy-lightsail",
      label: "VPS Ubuntu & PM2",
      subLabel: "PM2 Cluster Mode Deploy",
      category: "deploy",
      stage: 5,
      x: 1100,
      y: 160,
      w: 160,
      h: 46,
      summary: "Triển khai Web API Node.js và database MongoDB Atlas trên máy chủ ảo đám mây, tối ưu hiệu năng.",
      technicalDetails: "VPS Ubuntu 24.04 (IP: 103.179.189.65). Chạy ứng dụng Express Server bằng PM2 ở Cluster Mode (instances: 'max') để khai thác đa nhân CPU của VPS, đảm bảo không có thời gian chết (Zero-downtime reload) khi cập nhật mã nguồn.",
      files: [{ name: "ecosystem.config.js", path: "d:/temp_smartcare/ecosystem.config.js" }],
      qaList: [
        {
          question: "PM2 Cluster Mode giúp tăng tính sẵn sàng của ứng dụng như thế nào?",
          answer: "Dạ, PM2 sử dụng cơ chế Cluster của Node.js để sinh ra nhiều tiến trình con chạy song song khớp với số nhân CPU của VPS. Nếu một tiến trình con bị sập đột ngột do exception chưa được xử lý, PM2 lập tức sinh tiến trình mới thay thế, trong khi các tiến trình con khác vẫn tiếp tục xử lý các requests của người dùng, giúp dịch vụ không bị gián đoạn."
        }
      ],
      rubricMapping: "Tiêu chí Môi trường triển khai & Cấu hình máy chủ ứng dụng (Chương 5)"
    },
    {
      id: "deploy-caddy",
      label: "Caddy Reverse Proxy",
      subLabel: "Auto HTTPS Let's Encrypt",
      category: "deploy",
      stage: 5,
      x: 1100,
      y: 280,
      w: 160,
      h: 46,
      summary: "Web server tiếp nhận kết nối bảo mật HTTPS từ Internet và định tuyến nội bộ vào tiến trình Node.js.",
      technicalDetails: "Khai báo tên miền domain trong tệp Caddyfile. Caddy tự động lắng nghe cổng 80/443, tự động kích hoạt giao thức Let's Encrypt / ZeroSSL để xin cấp chứng chỉ SSL và tự động gia hạn trước 30 ngày. Proxy ngược về cổng nội bộ localhost:5000 của ứng dụng Express.",
      files: [{ name: "Caddyfile", path: "d:/temp_smartcare/Caddyfile" }],
      qaList: [
        {
          question: "Tại sao nhóm chọn Caddy thay vì Nginx truyền thống?",
          answer: "Dạ, Caddy có ưu điểm vượt trội là cấu hình vô cùng tối giản (chỉ cần 3 dòng trong Caddyfile) và tích hợp sẵn cơ chế cấp/gia hạn HTTPS SSL tự động hoàn toàn mà không cần cài đặt thêm Certbot hay viết script cronjob, loại bỏ hoàn toàn rủi ro sập dịch vụ do quên gia hạn chứng chỉ bảo mật."
        }
      ],
      rubricMapping: "Tiêu chí Thiết kế kiến trúc mạng an toàn & Bảo mật truyền tải (Chương 5)"
    },
    {
      id: "deploy-backup",
      label: "Render Cold Backup",
      subLabel: "Suspended DR Standby",
      category: "deploy",
      stage: 5,
      x: 1100,
      y: 400,
      w: 160,
      h: 46,
      summary: "Giải pháp dự phòng thảm họa khôi phục hoạt động của Web API khi VPS chính gặp sự cố dài ngày.",
      technicalDetails: "Triển khai Express Server lên Cloud Render ở trạng thái tạm dừng (Suspended) để tiết kiệm chi phí. Khi VPS Ubuntu chính gặp sự cố vật lý hoặc mất mạng diện rộng, quản trị viên kích hoạt (Resume) dịch vụ trên Render và đổi DNS để trỏ API endpoint về Render.",
      files: [{ name: "render.yaml", path: "d:/temp_smartcare/render.yaml" }],
      qaList: [
        {
          question: "Tại sao áp dụng Cold Standby mà không chạy song song Active-Active?",
          answer: "Dạ, vì lý do tối ưu hóa ngân sách đồ án. Chạy Active-Active yêu cầu phải thuê 2 hạ tầng liên tục và cấu hình Load Balancer đắt tiền. Cold Standby giúp nhóm có sẵn phương án khôi phục hệ thống (Disaster Recovery) với chi phí vận hành dự phòng bằng 0 khi hệ thống chính hoạt động bình thường."
        }
      ],
      rubricMapping: "Tiêu chí Thiết kế tính sẵn sàng cao & Khôi phục thảm họa (Chương 5)"
    },
    {
      id: "deploy-monitor",
      label: "PM2 Linux Monitor",
      subLabel: "Logs & Process Management",
      category: "deploy",
      stage: 5,
      x: 1100,
      y: 520,
      w: 160,
      h: 46,
      summary: "Quản lý và theo dõi sức khỏe hoạt động của Express App trên server bằng lệnh PM2 CLI.",
      technicalDetails: "Đăng ký PM2 khởi động cùng hệ điều hành qua pm2 startup. Sử dụng lệnh pm2 status để theo dõi mức chiếm RAM/CPU, pm2 logs --lines 100 để xem trực tiếp log lỗi, và pm2 monit để mở bảng dashboard CLI giám sát trực quan thời gian thực.",
      files: [{ name: "pm2-startup.sh", path: "d:/temp_smartcare/pm2-startup.sh" }],
      qaList: [
        {
          question: "Làm thế nào kiểm tra log lỗi Express trên máy chủ Ubuntu?",
          answer: "Dạ, ta sử dụng lệnh `pm2 logs smartcare-server` để xem trực tiếp log stderr/stdout thời gian thực, hoặc truy cập file log vật lý lưu tại thư mục `~/.pm2/logs/` để trích xuất các lỗi uncaught exception."
        }
      ],
      rubricMapping: "Tiêu chí Quản trị hệ điều hành máy chủ VPS & Giám sát hệ thống (Chương 5)"
    },
 
    // --- STAGE 6: SECURITY & TESTING (security_test) ---
    {
      id: "security-keys",
      label: "Bảo Mật Tệp Môi Trường",
      subLabel: "chmod 0600 .env Security",
      category: "security_test",
      stage: 6,
      x: 1360,
      y: 160,
      w: 160,
      h: 46,
      summary: "Quản lý và cô lập hoàn toàn các khóa API OpenAI, Cloudinary, JWT Secret ngoài thư mục Git.",
      technicalDetails: "Lưu toàn bộ biến môi trường nhạy cảm trong file .env ở root VPS. Chạy lệnh chmod 0600 .env để phân quyền: chỉ cho phép Owner (user chạy Node.js) có quyền đọc và viết tệp tin, chặn đứng nguy cơ bị các tài khoản hệ điều hành khác trên cùng VPS đọc trộm.",
      files: [{ name: ".env.example", path: "d:/temp_smartcare/.env.example" }],
      qaList: [
        {
          question: "Lệnh chmod 0600 có nghĩa là gì về mặt bảo mật?",
          answer: "Dạ, trong hệ điều hành Linux, chmod 0600 gán quyền 6 (đọc và viết - Read & Write) cho duy nhất chủ sở hữu file (Owner), gán quyền 0 (không có quyền gì) cho nhóm người dùng (Group) và tất cả người dùng khác (Others). Điều này ngăn chặn tuyệt đối việc rò rỉ mã bí mật khi máy chủ có nhiều tài khoản sử dụng."
        }
      ],
      rubricMapping: "Tiêu chí Thiết kế an toàn thông tin & Phân quyền tệp tin hệ thống (Chương 3 & 5)"
    },
    {
      id: "security-git",
      label: "GitHub CI/CD Gates",
      subLabel: "Secret Scan & Push Gate",
      category: "security_test",
      stage: 6,
      x: 1360,
      y: 280,
      w: 160,
      h: 46,
      summary: "Tự động kiểm tra chất lượng code và quét rò rỉ mã bảo mật trước khi cho phép merge code trên GitHub.",
      technicalDetails: "Thiết lập workflow GitHub Actions: khi có PR/Push, hệ thống tự động chạy lint check, build test và chạy GitHub Secret Scanning (Push Protection) phát hiện nếu lập trình viên vô tình để lộ OpenAI API key hay chuỗi MongoDB URI trong code. Lịch sử Git dự án SmartCare ghi nhận 20+ commits chất lượng từ tác giả phuc2610.",
      files: [{ name: "gitCommits.ts", path: "d:/temp_smartcare/src/data/gitCommits.ts" }],
      qaList: [
        {
          question: "Nếu phát hiện vô tình commit file .env chứa keys lên GitHub public, nhóm xử lý ra sao?",
          answer: "Dạ, việc đầu tiên là lập tức lên bảng điều khiển OpenAI và Cloudinary thu hồi, xóa bỏ (revoke) các API keys cũ đó ngay lập tức để vô hiệu hóa chúng, sau đó tạo keys mới. Không cố xóa commit bằng git push -f vì lịch sử cached commit của GitHub vẫn có thể bị quét trộm bởi các con bot tự động."
        }
      ],
      rubricMapping: "Tiêu chí Quy trình tích hợp liên tục (CI) & Quản lý chất lượng mã nguồn (Chương 5)"
    },
    {
      id: "testing-real",
      label: "Kiểm Thử Đa Tầng",
      subLabel: "Jest Unit & ADB Device",
      category: "security_test",
      stage: 6,
      x: 1360,
      y: 400,
      w: 160,
      h: 46,
      summary: "Thực hiện kiểm thử các hàm tiện ích bằng Jest trên Backend và smoke test kịch bản P0 trên thiết bị thật.",
      technicalDetails: "Backend chạy các test case kiểm tra hàm hash mật khẩu, kiểm tra giải mã JWT. Thiết lập kịch bản smoke test P0 trên thiết bị Android thật thông qua cáp USB và công cụ ADB để kiểm tra kết nối API, nhận thông báo Notifee thời gian thực và test độ chính xác cảm biến té ngã.",
      files: [{ name: "adb-test.ps1", path: "d:/temp_smartcare/adb-test.ps1" }],
      qaList: [
        {
          question: "Tại sao kiểm thử trên thiết bị di động thật (Real Device) là cực kỳ bắt buộc trong SmartCare?",
          answer: "Dạ, vì các tính năng cốt lõi của SmartCare như đọc cảm biến gia tốc kế (Accelerometer) và đẩy thông báo cục bộ nhiều đợt (Notifee Trigger) không thể mô phỏng chính xác 100% trên phần mềm giả lập (Emulator). Chạy thử trên máy thật giúp đo đạc đúng độ nhạy thuật toán té ngã và kiểm soát quyền chạy ngầm."
        }
      ],
      rubricMapping: "Tiêu chí Kiểm thử phần mềm & Đảm bảo chất lượng (Chương 5)"
    },
    {
      id: "rubric-mapping",
      label: "Đánh Giá & Rubric",
      subLabel: "4-Chapter Report Plan",
      category: "security_test",
      stage: 6,
      x: 1360,
      y: 520,
      w: 160,
      h: 46,
      summary: "Ánh xạ toàn bộ kiến thức kỹ thuật và chức năng SmartCare vào 4 chương của Báo cáo tốt nghiệp.",
      technicalDetails: "Phân bổ barem điểm bảo vệ Hội đồng tốt nghiệp:\\n- Chương 1: Lý thuyết nền tảng (React Native, Express, MongoDB Atlas, OpenAI)\\n- Chương 2: Phân tích thiết kế hệ thống (Usecase, Class, Sequence Diagrams)\\n- Chương 3: Cài đặt chương trình (useFallDetection, Notifee, OpenAI, PM2, Caddy)\\n- Chương 4: Kiểm thử, đánh giá chất lượng phần mềm và kết luận.",
      files: [{ name: "Rubric@SmartCare_Graduation.pdf", path: "d:/temp_smartcare/Rubric@SmartCare_Graduation.pdf" }],
      qaList: [
        {
          question: "Sinh viên nên chuẩn bị tâm lý thế nào cho 15 câu hỏi ôn bảo vệ Hội đồng tốt nghiệp?",
          answer: "Dạ, sinh viên cần ôn tập kỹ sơ đồ hành trình dữ liệu SVG tương tác này, nắm chắc thuật toán xử lý gia tốc kế té ngã, cơ chế Notifee, cách đánh chỉ mục MongoDB compound index, cơ chế SSL Caddy, và chính sách bảo mật env 0600. Nắm chắc 'Tại sao' sẽ giúp tự tin trả lời xuất sắc mọi câu hỏi phản biện."
        }
      ],
      rubricMapping: "Toàn bộ khung Báo cáo Tốt nghiệp & Slide bảo vệ đồ án."
    }
  ];
"""

try:
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    
    # Tìm vị trí bắt đầu của mảng staticNodes
    start_tag = "  // Định nghĩa 24 nodes bám sát"
    if start_tag not in content:
        start_tag = "  // Định nghĩa 25 nodes bám sát"
    
    start_idx = content.find(start_tag)
    if start_idx == -1:
        # Dự phòng tìm theo staticNodes
        start_idx = content.find("  const staticNodes: KnowledgeNode[] = [")
        
    if start_idx == -1:
        raise ValueError("Could not find start of staticNodes in file!")
        
    # Tìm vị trí bắt đầu của staticEdges
    end_tag = "  // Định nghĩa các đường nối Edges"
    if end_tag not in content:
        end_tag = "  const staticEdges: KnowledgeEdge[] = ["
        
    end_idx = content.find(end_tag)
    if end_idx == -1:
        raise ValueError("Could not find start of staticEdges in file!")
        
    print(f"Start index: {start_idx}, End index: {end_idx}")
    
    # Cắt ghép tệp tin
    new_content = content[:start_idx] + smart_nodes_code + content[end_idx:]
    
    # Ghi lại tệp tin ở dạng UTF-8 chuẩn không BOM
    with open(filepath, "w", encoding="utf-8", newline="\n") as f:
        f.write(new_content)
        
    print("SUCCESS: File repaired successfully!")
    
except Exception as e:
    print(f"Error repairing file: {e}")
