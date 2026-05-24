import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, "public", "audio", "voiceover");
const scriptOutput = join(root, "public", "audio", "eatfitai-voice-script-vi.txt");

const TTS_API_URL = process.env.EATFITAI_TTS_API_URL ?? "http://127.0.0.1:5002/api/tts";

const cues = [
  {
    file: "00-intro.wav",
    text: "Ít Phít Ai giúp bạn hiểu bữa ăn nhanh hơn. Không còn đoán mò khi ăn.",
    speed: 1.36,
  },
  {
    file: "01-home.wav",
    text: "Mở trang chủ, xem ngay ca lo còn lại, phần thiếu và phần vượt.",
    speed: 1.36,
  },
  {
    file: "02-diary.wav",
    text: "Ăn món quen? Tìm món, chọn khẩu phần, lưu. Nhật ký cập nhật ngay.",
    speed: 1.38,
  },
  {
    file: "03-recipe.wav",
    text: "Có nguyên liệu sẵn? Mô Chi gợi ý món hợp mục tiêu hôm nay.",
    speed: 1.36,
  },
  {
    file: "04-scan-entry.wav",
    text: "Ghi bữa từ ảnh? Chọn ảnh món ăn trong máy.",
    speed: 1.38,
  },
  {
    file: "05-scan-result.wav",
    text: "Trí tuệ nhân tạo nhận diện món, báo độ chính xác, rồi nhắc bạn kiểm tra.",
    speed: 1.36,
  },
  {
    file: "06-review.wav",
    text: "Bạn chỉnh tên món, khẩu phần, bữa ăn, rồi lưu vào nhật ký. Quyền quyết định vẫn là của bạn.",
    speed: 1.36,
  },
  {
    file: "07-stats.wav",
    text: "Cuối ngày, thống kê cho biết bạn ăn bao nhiêu, lệch ở đâu, bữa nào ảnh hưởng nhất.",
    speed: 1.36,
  },
  {
    file: "08-outro.wav",
    text: "Ít Phít Ai. Ăn uống rõ ràng hơn, kiểm soát nhẹ nhàng hơn.",
    speed: 1.34,
  },
];

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  scriptOutput,
  cues.map((cue, index) => `${index + 1}. ${cue.text}`).join("\n\n"),
  "utf8",
);

for (const cue of cues) {
  const payload = {
    text: cue.text,
    voice: "vi_female_doan",
    style: "concise",
    speed: cue.speed,
    pause_duration: 0.07,
    render_profile: "hq_vietnamese",
  };

  const response = await fetch(TTS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS request failed for ${cue.file} (${response.status}): ${error}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(join(outputDir, cue.file), audioBuffer);
  console.log(`Generated ${cue.file}`);
}

console.log(`Script saved to ${scriptOutput}`);
