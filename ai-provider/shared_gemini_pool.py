"""
Singleton GeminiPoolManager — Dùng chung cho toàn bộ AI Provider.

Tránh tạo nhiều instance riêng biệt trong stt_service.py và nutrition_llm.py
vì mỗi instance tracking rate limit độc lập → desync quota → double-counting.
"""
import logging
from typing import Optional

from gemini_pool import GeminiPoolManager

logger = logging.getLogger(__name__)

_shared_pool: Optional[GeminiPoolManager] = None


def get_shared_pool() -> GeminiPoolManager:
    """Trả về singleton GeminiPoolManager, lazy init lần đầu."""
    global _shared_pool
    if _shared_pool is None:
        _shared_pool = GeminiPoolManager.from_env()
        logger.info("✅ Shared GeminiPoolManager initialized (singleton)")
    return _shared_pool
