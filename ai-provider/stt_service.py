"""
Gemini Audio STT Service - Thay thế Whisper
Dùng Gemini 2.5 Flash để chuyển audio → text.
Ưu điểm: Không cần tải model 1.5GB, chạy nhẹ trên free-tier.
"""
import os
import logging
import base64
import mimetypes
from typing import Optional

from gemini_pool import GeminiPoolManager, GeminiPoolError

logger = logging.getLogger(__name__)

# Gemini pool instance - chia sẻ với nutrition_llm.py
_gemini_pool: Optional[GeminiPoolManager] = None

# Giới hạn kích thước file audio (10MB)
MAX_AUDIO_SIZE_BYTES = int(os.getenv("STT_MAX_AUDIO_SIZE_BYTES", str(10 * 1024 * 1024)))

# Các format audio được hỗ trợ
SUPPORTED_AUDIO_MIMES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mp3",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
}


def _get_pool() -> GeminiPoolManager:
    """Lazy init Gemini pool (dùng chung với nutrition_llm)."""
    global _gemini_pool
    if _gemini_pool is None:
        from shared_gemini_pool import get_shared_pool
        _gemini_pool = get_shared_pool()
    return _gemini_pool


def _detect_mime(file_path: str) -> str:
    """Xác định MIME type từ extension."""
    ext = os.path.splitext(file_path)[1].lower()
    return SUPPORTED_AUDIO_MIMES.get(ext, "audio/wav")


def is_stt_available() -> bool:
    """Kiểm tra STT service có sẵn sàng (Gemini pool hoạt động)."""
    try:
        return _get_pool().has_available_entry()
    except Exception:
        return False


def transcribe_audio(audio_path: str) -> str:
    """
    Chuyển file audio thành text tiếng Việt bằng Gemini Audio API.
    
    Gemini 2.5 Flash hỗ trợ nhận audio inline qua base64.
    Gửi audio kèm prompt yêu cầu transcription → nhận text thuần.
    
    Returns: Chuỗi text transcription, rỗng nếu lỗi.
    """
    if not os.path.isfile(audio_path):
        logger.error("Audio file không tồn tại: %s", audio_path)
        return ""

    file_size = os.path.getsize(audio_path)
    if file_size > MAX_AUDIO_SIZE_BYTES:
        logger.error(
            "Audio file quá lớn: %s bytes (max %s)",
            file_size,
            MAX_AUDIO_SIZE_BYTES,
        )
        return ""

    if file_size == 0:
        logger.error("Audio file rỗng: %s", audio_path)
        return ""

    mime_type = _detect_mime(audio_path)
    logger.info(
        "Transcribing audio: %s (%s, %s bytes)",
        audio_path,
        mime_type,
        file_size,
    )

    try:
        # Đọc và encode audio file sang base64
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        pool = _get_pool()

        # Gọi Gemini với audio inline
        # Gemini 2.5 Flash hỗ trợ multimodal input (text + audio)
        prompt = (
            "Hãy nghe đoạn audio này và chuyển thành văn bản tiếng Việt. "
            "Chỉ trả lời nội dung transcription thuần túy, không thêm giải thích."
        )

        result = pool.generate_with_audio(
            prompt=prompt,
            audio_base64=audio_b64,
            audio_mime_type=mime_type,
            temperature=0.0,
            max_output_tokens=500,
        )

        if result:
            text = result.strip()
            logger.info("Transcription thành công: %s...", text[:80])
            return text

        logger.warning("Gemini trả về kết quả rỗng cho audio transcription")
        return ""

    except GeminiPoolError as exc:
        logger.error("Gemini pool lỗi khi transcribe: %s", exc)
        return ""
    except Exception as exc:
        logger.error("Lỗi không mong đợi khi transcribe: %s", exc)
        return ""
