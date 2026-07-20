# TÀI LIỆU CẤU TRÚC SAO LƯU (BACKUP JSON) & ĐỊNH DẠNG CÂU HỎI (QUESTION SCHEMAS)

Tài liệu này giải thích chi tiết cấu trúc dữ liệu của file sao lưu `.json` xuất ra từ trang quản trị Admin và định dạng chi tiết của từng loại câu hỏi trong hệ thống IC3 LMS.

---

## I. CẤU TRÚC FILE SAO LƯU TỔNG THỂ (BACKUP JSON)

Khi xuất dữ liệu (`exportAllData()`), hệ thống sẽ tạo ra một file JSON có định dạng như sau:

```json
{
  "timestamp": "2026-07-19T14:15:30.123Z",
  "localStorage": {
    "ic3_blocks": "[{\"id\":\"block_1\",\"name\":\"Khối 3\"}]"
  },
  "firestore": {
    "users": [
      {
        "id": "email_hoc_sinh@gmail.com",
        "data": { "email": "email_hoc_sinh@gmail.com", "role": "student", "name": "Nguyễn Văn A" }
      }
    ],
    "students": [...],
    "teachers": [...],
    "classes": [...],
    "questions": [...],
    "tests": [...],
    "scores": [...],
    "rewards": [...],
    "bosses": [...],
    "pokemons": [...],
    "settings": [...],
    "system": [...]
  }
}
```

### Các trường dữ liệu chính:
1. **`timestamp`**: Thời gian tạo bản sao lưu (định dạng ISO).
2. **`localStorage`**: Lưu trữ các cấu hình ngoại tuyến như khối lớp học.
3. **`firestore`**: Chứa toàn bộ các Collection (Bảng dữ liệu) từ Cloud Firestore. Mỗi collection là một mảng các phần tử có dạng `{ id: "document_id", data: { ... } }` giúp dễ dàng nạp đè hoặc trộn hợp (`merge`) khi nhập dữ liệu (`importAllData()`).

---

## II. ĐỊNH DẠNG CHI TIẾT CÁC LOẠI CÂU HỎI (QUESTIONS SCHEMA)

Mỗi tài liệu trong collection `questions` có các thuộc tính cơ bản chung:
- `id` (string): ID duy nhất của câu hỏi (ví dụ: `q_teacher_12345`).
- `type` (string): Loại câu hỏi (xem chi tiết bên dưới).
- `question` hoặc `text` (string): Nội dung câu hỏi.
- `imageUrl` hoặc `image` (string): Đường dẫn ảnh minh họa (nếu có, nếu không thì để chuỗi rỗng `""`).
- `explanation` (string): Lời giải thích đáp án chi tiết khi học sinh làm xong.
- `blockId` (string): Khối lớp tương ứng.
- `level` (string): Cấp độ câu hỏi (`level_1`, `level_2`, `level_3`).

Dưới đây là định dạng cấu trúc riêng cho từng loại câu hỏi:

### 1. Trắc nghiệm đơn lựa chọn (`choice`)
Học sinh chọn 1 trong 4 đáp án.
* **`options`** (Array[string]): Mảng gồm chính xác 4 phương án (vị trí `0, 1, 2, 3` tương ứng với `A, B, C, D`).
* **`correctIndex`** (number): Vị trí đáp án đúng trong mảng `options` (`0` tới `3`).
* **`answer`** (string): Văn bản đáp án đúng để hiển thị nhanh.

*Ví dụ:*
```json
{
  "id": "q_choice_001",
  "type": "choice",
  "question": "Phím tắt để sao chép văn bản trong Windows là gì?",
  "image": "",
  "options": ["Ctrl + V", "Ctrl + C", "Ctrl + X", "Ctrl + Z"],
  "correctIndex": 1,
  "answer": "Ctrl + C",
  "explanation": "Sử dụng Ctrl + C để sao chép (Copy) và Ctrl + V để dán (Paste)."
}
```

---

### 2. Trắc nghiệm đa lựa chọn (`multi_choice`)
Học sinh chọn một hoặc nhiều đáp án đúng.
* **`options`** (Array[string]): Mảng 4 phương án lựa chọn.
* **`correctIndices`** (Array[number]): Mảng chứa các vị trí của đáp án đúng (ví dụ: `[0, 2]`).
* **`answer`** (string): Chuỗi danh sách đáp án đúng ghép lại bằng dấu phẩy.

*Ví dụ:*
```json
{
  "id": "q_multi_001",
  "type": "multi_choice",
  "question": "Những thiết bị nào sau đây là thiết bị ngoại vi đầu vào (Input)?",
  "image": "",
  "options": ["Bàn phím", "Màn hình", "Chuột máy tính", "Máy in"],
  "correctIndices": [0, 2],
  "answer": "Bàn phím, Chuột máy tính",
  "explanation": "Bàn phím và chuột truyền tín hiệu từ người dùng vào máy tính, do đó là thiết bị ngoại vi đầu vào."
}
```

---

### 3. Trắc nghiệm hình ảnh (`image_choice`)
Học sinh chọn phương án đúng, nhưng nội dung các phương án hiển thị dưới dạng hình ảnh.
* **`options`** (Array[string]): Mảng gồm 4 đường dẫn URL hình ảnh tương ứng các phương án A, B, C, D.
* **`correctIndex`** (number): Vị trí ảnh đúng (`0` tới `3`).
* **`answer`** (string): URL của ảnh đúng.

*Ví dụ:*
```json
{
  "id": "q_img_001",
  "type": "image_choice",
  "question": "Hãy chọn biểu tượng của trình duyệt Google Chrome?",
  "image": "",
  "options": [
    "https://example.com/safari.png",
    "https://example.com/chrome.png",
    "https://example.com/firefox.png",
    "https://example.com/edge.png"
  ],
  "correctIndex": 1,
  "answer": "https://example.com/chrome.png",
  "explanation": "Hình ảnh ở phương án B là biểu tượng chuẩn của trình duyệt Google Chrome."
}
```

---

### 4. Câu hỏi Đúng / Sai (`true_false`)
Học sinh chọn một trong hai phương án Đúng hoặc Sai.
* **`options`** (Array[string]): Luôn là `["Đúng", "Sai"]`.
* **`correctIndex`** (number): `0` là Đúng, `1` là Sai.
* **`answer`** (string): `"Đúng"` hoặc `"Sai"`.

*Ví dụ:*
```json
{
  "id": "q_tf_001",
  "type": "true_false",
  "question": "RAM là bộ nhớ dữ liệu sẽ bị mất đi khi máy tính tắt nguồn?",
  "image": "",
  "options": ["Đúng", "Sai"],
  "correctIndex": 0,
  "answer": "Đúng",
  "explanation": "Đúng. RAM là bộ nhớ truy xuất ngẫu nhiên tạm thời (Volatile memory), mất dữ liệu khi mất điện."
}
```

---

### 5. Câu hỏi khoanh vùng ảnh (`hotspot`)
Học sinh nhấp chuột vào đúng khu vực cần xác định trên một tấm ảnh nền lớn.
* **`imageUrl`** hoặc **`image`** (string): URL tấm ảnh nền để học sinh nhấp chọn.
* **`hotspots`** (Array[object]): Danh sách tọa độ tỉ lệ phần trăm các vùng đúng vẽ bằng chuột:
  * `x` (number): Tọa độ góc trái trên (0 - 100%) theo trục ngang.
  * `y` (number): Tọa độ góc trái trên (0 - 100%) theo trục đứng.
  * `w` (number): Chiều rộng vùng chọn (0 - 100%).
  * `h` (number): Chiều cao vùng chọn (0 - 100%).
  * `label` (string): Tên nhãn vùng chọn.
* **`requiredCount`** (number): Số lượng vị trí đúng cần xác định.

*Ví dụ:*
```json
{
  "id": "q_hotspot_001",
  "type": "hotspot",
  "question": "Hãy nhấp chọn vào biểu tượng Thùng rác (Recycle Bin) trên màn hình dưới đây?",
  "image": "https://example.com/desktop_screen.png",
  "imageUrl": "https://example.com/desktop_screen.png",
  "hotspots": [
    { "x": 10.5, "y": 15.2, "w": 8.0, "h": 12.0, "label": "Thùng rác" }
  ],
  "requiredCount": 1,
  "answer": "Xác định đúng 1 vị trí trên ảnh.",
  "explanation": "Biểu tượng thùng rác thường nằm ở góc trên bên trái màn hình Desktop."
}
```

---

### 6. Kéo thả chữ khớp mô tả (`drag_text`)
Kéo thả từ khóa tương ứng để hoàn thiện các câu mô tả bên trái.
* **`rows`** (Array[object]): Mảng vế trái chứa mô tả hoặc từ gợi ý:
  * `label` (string) hoặc `text` (string): Nội dung hiển thị bên trái.
* **`options`** (Array[string]): Các từ khóa màu đỏ sẽ trộn ngẫu nhiên để học sinh kéo thả.
* **`correctAnswers`** (Array[string]): Mảng chứa các đáp án đúng theo thứ tự tương ứng với mảng `rows`.

*Ví dụ:*
```json
{
  "id": "q_drag_text_001",
  "type": "drag_text",
  "question": "Kéo thả các thuật ngữ phù hợp với mô tả bộ nhớ:",
  "image": "",
  "rows": [
    { "label": "Bộ nhớ trong tốc độ cao nhất của CPU" },
    { "label": "Thiết bị lưu trữ dữ liệu vĩnh viễn" }
  ],
  "options": ["SSD/HDD", "Bộ nhớ đệm Cache", "RAM"],
  "correctAnswers": ["Bộ nhớ đệm Cache", "SSD/HDD"],
  "answer": "Ghép đúng các cặp từ khóa.",
  "explanation": "Cache nằm sát nhân CPU có tốc độ đọc ghi cực nhanh. Ổ cứng SSD/HDD dùng lưu trữ dữ liệu lâu dài."
}
```

---

### 7. Kéo thả chữ khớp hình ảnh (`drag_image_text`)
Học sinh xem các bức ảnh nhỏ và kéo thả từ khóa khớp tương ứng với từng ảnh.
* **`leftImages`** (Array[string]): Mảng các URL hình ảnh nhỏ đại diện cho vế trái.
* **`options`** (Array[string]): Danh sách các từ khóa đáp án màu đỏ trộn đều để học sinh kéo.
* **`correctAnswers`** (Array[string]): Các từ khóa tương ứng khớp theo thứ tự của mảng `leftImages`.

*Ví dụ:*
```json
{
  "id": "q_drag_img_001",
  "type": "drag_image_text",
  "question": "Ghép từ khóa chính xác cho từng cổng kết nối sau:",
  "image": "",
  "leftImages": [
    "https://example.com/port_hdmi.png",
    "https://example.com/port_usb.png"
  ],
  "options": ["Cổng USB", "Cổng HDMI", "Cổng LAN"],
  "correctAnswers": ["Cổng HDMI", "Cổng USB"],
  "answer": "Khớp đúng nhãn tên cho từng hình ảnh.",
  "explanation": "Cổng dẹt góc chéo là cổng truyền hình ảnh/âm thanh HDMI. Cổng hình chữ nhật mỏng là USB."
}
```

---

### 8. Ghép nối bảng ma trận (`table_match`)
Học sinh tích chọn ô giao nhau (checkbox/radio) giữa Hàng và Cột để ghép các khái niệm đúng.
* **`headers`** (Array[string]): Tiêu đề của bảng. Gồm 2 phần tử: `[Tiêu đề cột trái, Tiêu đề cột phải]`.
* **`options`** (Array[string]): Các tiêu đề của cột lựa chọn bên phải (ví dụ: `["Thiết bị vào", "Thiết bị ra"]`).
* **`rows`** (Array[string]): Các hàng câu hỏi cột bên trái (ví dụ: `["Bàn phím", "Màn hình", "Máy in"]`).
* **`correctAnswers`** (Array[number]): Vị trí cột đáp án đúng (tính từ `0`) ứng với từng phần tử của mảng `rows`.

*Ví dụ:*
```json
{
  "id": "q_table_001",
  "type": "table_match",
  "question": "Phân loại thiết bị ngoại vi sau đây:",
  "image": "",
  "headers": ["Thiết bị phần cứng", "Nhóm phân loại"],
  "options": ["Thiết bị Đầu vào (Input)", "Thiết bị Đầu ra (Output)"],
  "rows": ["Bàn phím", "Màn hình", "Chuột", "Máy in"],
  "correctAnswers": [0, 1, 0, 1],
  "answer": "Liên kết chính xác bảng ghép nối.",
  "explanation": "Bàn phím và chuột gửi tín hiệu vào máy tính (Đầu vào). Màn hình và máy in xuất thông tin ra (Đầu ra)."
}
```

---

## III. HƯỚNG DẪN IMPORT VÀO PROJECT KHÁC

Để project khác hiểu và nhập dữ liệu thành công từ file JSON này, mã nguồn ở project đó cần thực hiện các điều kiện sau:

1. **Sử dụng đúng bộ thư viện Firestore v9/v10**:
   Sử dụng hàm `doc`, `setDoc` của Firebase Web SDK với cấu hình `{ merge: true }` để nạp dữ liệu không bị ghi đè mất các trường mới:
   ```javascript
   import { doc, setDoc } from "firebase/firestore";
   // Lặp qua từng collection trong backup.firestore và thực thi ghi dữ liệu
   await setDoc(doc(db, colName, docId), docData, { merge: true });
   ```
2. **Khởi tạo đúng các Key liên kết trong LocalStorage**:
   Nếu có liên kết khối lớp học dạng offline, cần import thêm trường `localStorage.ic3_blocks` vào LocalStorage của trình duyệt đích trước khi ứng dụng khởi chạy.
