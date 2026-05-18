"""
Nutrition LLM Service - Powered by Google Gemini API (Cloud)
Thay thế Ollama local bằng Gemini API cho production deployment.
Giữ nguyên: Cache system, Mifflin-St Jeor fallback, Voice parsing logic.
"""

from __future__ import annotations
import os
import json
import logging
import hashlib
import time
import re
import unicodedata
from urllib.parse import urlparse
from typing import Any, Dict, Optional

import requests

from gemini_pool import (
    DEFAULT_MODEL,
    GeminiPoolError,
    GeminiPoolManager,
    GeminiQuotaExhaustedError,
    GeminiUnavailableError,
)

logger = logging.getLogger(__name__)

# Configuration - Gemini API (thay thế Ollama)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
NUTRITION_TARGET_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "calories": {"type": "integer"},
        "protein": {"type": "integer"},
        "carbs": {"type": "integer"},
        "fat": {"type": "integer"},
        "explanation": {"type": "string"},
    },
    "required": ["calories", "protein", "carbs", "fat", "explanation"],
}

# ============== SIMPLE CACHE SYSTEM ==============
# In-memory cache với TTL để giảm API calls và chi phí

class SimpleCache:
    """Simple in-memory cache với TTL (Time To Live)"""
    def __init__(self, default_ttl: int = 300):  # 5 phút mặc định
        self._cache: Dict[str, tuple] = {}  # {key: (value, expire_time)}
        self._default_ttl = default_ttl
    
    def _make_key(self, prompt: str) -> str:
        """Tạo cache key từ prompt"""
        return hashlib.md5(prompt.encode()).hexdigest()
    
    def get(self, prompt: str) -> Optional[str]:
        """Lấy giá trị từ cache nếu còn hợp lệ"""
        key = self._make_key(prompt)
        if key in self._cache:
            value, expire_time = self._cache[key]
            if time.time() < expire_time:
                logger.debug(f"Cache hit for key {key[:8]}...")
                return value
            else:
                del self._cache[key]
        return None
    
    def set(self, prompt: str, value: str, ttl: int = None):
        """Lưu giá trị vào cache"""
        key = self._make_key(prompt)
        expire_time = time.time() + (ttl or self._default_ttl)
        self._cache[key] = (value, expire_time)
    
    def clear(self):
        """Xóa toàn bộ cache"""
        self._cache.clear()

# Global cache instances
_general_cache = SimpleCache(default_ttl=300)

# ============== GEMINI API CLIENT ==============

_gemini_pool: Optional[GeminiPoolManager] = None


def _get_gemini_pool() -> GeminiPoolManager:
    """Lazy init Gemini pool manager."""
    global _gemini_pool
    if _gemini_pool is None:
        from shared_gemini_pool import get_shared_pool
        _gemini_pool = get_shared_pool()
    return _gemini_pool


def get_gemini_runtime_status() -> Dict[str, Any]:
    """Expose runtime Gemini model/pool metadata for health reporting."""
    return _get_gemini_pool().get_runtime_status()


def ensure_gemini_service_available() -> Dict[str, Any]:
    """Raise when Gemini service is unavailable or quota-exhausted."""
    pool = _get_gemini_pool()
    pool.ensure_service_available()
    return pool.get_runtime_status()


def is_gemini_available() -> bool:
    """Kiểm tra Gemini API có sẵn sàng không"""
    try:
        return _get_gemini_pool().has_available_entry()
    except Exception as exc:
        logger.error(f"Gemini availability check failed: {exc}")
        return False

def query_gemini(
    prompt: str,
    use_cache: bool = True,
    cache_ttl: int = None,
    response_schema: Optional[Dict[str, Any]] = None,
    thinking_budget: Optional[int] = None,
    tools: Optional[list[Dict[str, Any]]] = None,
) -> Optional[str]:
    """
    Query Gemini API với cache support.
    Returns None nếu lỗi.
    """
    # Check cache
    if use_cache:
        cached = _general_cache.get(prompt)
        if cached:
            logger.info("Gemini cache hit - returning cached response")
            return cached
    
    try:
        response = _get_gemini_pool().generate_text(
            prompt,
            temperature=0.1,
            max_output_tokens=500,
            response_mime_type="application/json",
            response_schema=response_schema,
            thinking_budget=thinking_budget,
            tools=tools,
        )
        
        if response:
            
            # Lưu cache
            if use_cache:
                _general_cache.set(prompt, response, cache_ttl)
            
            return response
        logger.warning("Gemini returned empty response")
        return None
    
    except (GeminiQuotaExhaustedError, GeminiUnavailableError):
        raise
    except GeminiPoolError as exc:
        logger.error(f"Gemini pool rejected request: {exc}")
        return None
    except Exception as exc:
        logger.error(f"Gemini query failed: {exc}")
        return None


# ============== FALLBACK: Mifflin-St Jeor Formula ==============

def _normalize_goal(goal: str) -> str:
    normalized = (goal or "maintain").strip().lower()
    if normalized in {"lose", "weight_loss", "giam_can", "giảm cân", "cut"}:
        return "cut"
    if normalized in {"gain", "weight_gain", "tang_can", "tăng cân", "bulk"}:
        return "bulk"
    return "maintain"


def _build_formula_result(
    gender: str,
    age: int,
    height_cm: float,
    weight_kg: float,
    activity_level: str,
    goal: str,
    *,
    source: str = "formula",
    message: Optional[str] = None,
) -> Dict[str, Any]:
    result = calculate_nutrition_mifflin(
        gender,
        age,
        height_cm,
        weight_kg,
        activity_level,
        goal,
    )
    result["source"] = source
    result["offlineMode"] = True
    result["message"] = (
        message
        or "AI tạm thời không khả dụng. EatFitAI đã dùng công thức chuẩn để tính mục tiêu."
    )
    return result


def _is_target_within_bounds(
    calories: int,
    protein: int,
    carbs: int,
    fat: int,
    weight_kg: float,
) -> bool:
    if calories < 800 or calories > 6000:
        return False
    if protein < 40 or protein > max(350, int(round(weight_kg * 3.5))):
        return False
    if carbs < 0 or carbs > 800:
        return False
    if fat < 20 or fat > 220:
        return False

    macro_calories = protein * 4 + carbs * 4 + fat * 9
    return calories * 0.55 <= macro_calories <= calories * 1.25


def _coerce_nutrition_int(value: Any) -> int:
    if isinstance(value, bool) or value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(round(float(value)))

    text = str(value).strip().lower().replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return 0
    try:
        return int(round(float(match.group(0))))
    except (TypeError, ValueError):
        return 0


def _parse_nutrition_target_response(response: str) -> Optional[Dict[str, Any]]:
    start = response.find("{")
    end = response.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(response[start:end])
        except json.JSONDecodeError:
            logger.warning("Failed to parse Gemini response: %s", response[:100])

    fields: Dict[str, Any] = {}
    for key in ("calories", "protein", "carbs", "fat"):
        match = re.search(
            rf'"{key}"\s*:\s*("([^"]*)"|-?\d+(?:\.\d+)?)',
            response,
            flags=re.IGNORECASE,
        )
        if match:
            fields[key] = match.group(2) if match.group(2) is not None else match.group(1)

    if not all(key in fields for key in ("calories", "protein", "carbs", "fat")):
        return None

    explanation_match = re.search(
        r'"explanation"\s*:\s*"([^"]*)',
        response,
        flags=re.IGNORECASE,
    )
    fields["explanation"] = explanation_match.group(1) if explanation_match else ""
    fields["_recovered_from_partial_json"] = True
    return fields


def calculate_nutrition_mifflin(
    gender: str,
    age: int,
    height_cm: float,
    weight_kg: float,
    activity_level: str,
    goal: str
) -> Dict[str, int]:
    """
    Mifflin-St Jeor equation fallback
    Đảm bảo các giá trị macro luôn hợp lý
    """
    # BMR calculation
    if gender.lower() in ["male", "nam"]:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    
    # Activity multiplier
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    multiplier = activity_multipliers.get(activity_level.lower(), 1.55)
    
    # TDEE
    tdee = bmr * multiplier
    normalized_goal = _normalize_goal(goal)
    goal_adjustment = {
        "cut": 0.80,
        "maintain": 1.00,
        "bulk": 1.10,
    }.get(normalized_goal, 1.00)
    calories = int(round(tdee * goal_adjustment))

    protein_per_kg = 2.2 if normalized_goal == "cut" else 1.8
    protein = int(round(protein_per_kg * weight_kg))
    fat_calories = int(round(calories * 0.25))
    fat = int(round(fat_calories / 9.0))
    carb_calories = max(0, calories - (protein * 4) - fat_calories)
    carbs = int(round(carb_calories / 4.0))
    
    logger.info(f"Formula calculated: cal={calories}, p={protein}, c={carbs}, f={fat}")
    
    goal_explanations = {
        "cut": f"Giảm còn khoảng 80% TDEE ({int(round(tdee))}→{calories} kcal) và ưu tiên protein {protein}g để giữ cơ bắp.",
        "bulk": f"Tăng khoảng 10% TDEE ({int(round(tdee))}→{calories} kcal) để hỗ trợ tăng cơ ổn định.",
        "maintain": f"Duy trì quanh mức TDEE {calories} kcal với protein {protein}g, fat {fat}g và carbs {carbs}g."
    }
    explanation = goal_explanations.get(
        normalized_goal,
        f"TDEE {calories} kcal với protein {protein}g, carbs {carbs}g, fat {fat}g.",
    )
    
    return {
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "explanation": explanation
    }


# ============== GEMINI NUTRITION ADVICE ==============

def get_nutrition_advice_gemini(
    gender: str, age: int, height_cm: float, weight_kg: float,
    activity_level: str, goal: str
) -> Dict[str, Any]:
    """Lấy nutrition advice từ Gemini API"""
    
    prompt = f"""Bạn là chuyên gia dinh dưỡng. Tính mục tiêu dinh dưỡng hàng ngày CHÍNH XÁC.

CÔNG THỨC: Mifflin-St Jeor
- Nam: BMR = 10 × cân_nặng + 6.25 × chiều_cao - 5 × tuổi + 5
- Nữ: BMR = 10 × cân_nặng + 6.25 × chiều_cao - 5 × tuổi - 161
- TDEE = BMR × Activity (sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9)
- lose/cut: TDEE×0.80, maintain: TDEE×1.0, gain/bulk: TDEE×1.10
- Protein: cut = 2.2g/kg, maintain/bulk = 1.8g/kg
- Fat = 25% calories (÷9)
- Carbs = calories còn lại sau protein và fat

THÔNG TIN: {gender}, {age} tuổi, {height_cm}cm, {weight_kg}kg, {activity_level}, {goal}

TRẢ LỜI JSON (chỉ JSON, không giải thích thêm):
{{"calories": int, "protein": int, "carbs": int, "fat": int, "explanation": "giải thích ngắn gọn BẰNG TIẾNG VIỆT, dễ hiểu cho người dùng phổ thông, không dùng thuật ngữ kỹ thuật"}}"""

    # Do not cache the raw Gemini response here. The response must pass domain
    # validation first; otherwise one malformed model response can stick and
    # force formula fallback until the process cache expires.
    response = query_gemini(
        prompt,
        use_cache=False,
        response_schema=NUTRITION_TARGET_SCHEMA,
        thinking_budget=0,
    )
    
    if response:
        recovered_result = _parse_nutrition_target_response(response)
        if recovered_result:
            calories = _coerce_nutrition_int(recovered_result.get("calories", 0))
            protein = _coerce_nutrition_int(recovered_result.get("protein", 0))
            carbs = _coerce_nutrition_int(recovered_result.get("carbs", 0))
            fat = _coerce_nutrition_int(recovered_result.get("fat", 0))

            if not _is_target_within_bounds(calories, protein, carbs, fat, weight_kg):
                logger.warning(
                    "Gemini nutrition target out of bounds: cal=%s, p=%s, c=%s, f=%s",
                    calories,
                    protein,
                    carbs,
                    fat,
                )
                return _build_formula_result(
                    gender,
                    age,
                    height_cm,
                    weight_kg,
                    activity_level,
                    goal,
                    source="formula_validated",
                )

            if recovered_result.pop("_recovered_from_partial_json", False):
                logger.info("Recovered Gemini nutrition target from partial JSON response")
            recovered_result["source"] = "gemini"
            recovered_result["offlineMode"] = False
            recovered_result["message"] = None
            recovered_result["calories"] = calories
            recovered_result["protein"] = protein
            recovered_result["carbs"] = carbs
            recovered_result["fat"] = fat
            return recovered_result

        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                
                calories = _coerce_nutrition_int(result.get("calories", 0))
                protein = _coerce_nutrition_int(result.get("protein", 0))
                carbs = _coerce_nutrition_int(result.get("carbs", 0))
                fat = _coerce_nutrition_int(result.get("fat", 0))
                
                if not _is_target_within_bounds(calories, protein, carbs, fat, weight_kg):
                    logger.warning(
                        "Gemini trả về kết quả ngoài ngưỡng hợp lý: cal=%s, p=%s, c=%s, f=%s",
                        calories,
                        protein,
                        carbs,
                        fat,
                    )
                    return _build_formula_result(
                        gender,
                        age,
                        height_cm,
                        weight_kg,
                        activity_level,
                        goal,
                        source="formula_validated",
                        message="AI trả dữ liệu chưa hợp lệ. EatFitAI đã dùng công thức chuẩn để tính mục tiêu.",
                    )
                
                result["source"] = "gemini"
                result["offlineMode"] = False
                result["message"] = None
                result["calories"] = calories
                result["protein"] = protein
                result["carbs"] = carbs
                result["fat"] = fat
                return result
                
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Gemini response: {response[:100]}")
        logger.warning("Gemini response did not contain a JSON object: %s", response[:100])
    
    return _build_formula_result(
        gender,
        age,
        height_cm,
        weight_kg,
        activity_level,
        goal,
    )


# ============== MAIN FUNCTION ==============

def get_nutrition_advice(
    gender: str, age: int, height_cm: float, weight_kg: float,
    activity_level: str, goal: str
) -> Dict[str, Any]:
    """Main function: Gemini first, fallback formula"""
    try:
        ensure_gemini_service_available()
        logger.info("Using Gemini API")
        return get_nutrition_advice_gemini(
            gender,
            age,
            height_cm,
            weight_kg,
            activity_level,
            goal,
        )
    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning("Gemini unavailable, using formula fallback: %s", exc)
        return _build_formula_result(
            gender,
            age,
            height_cm,
            weight_kg,
            activity_level,
            goal,
            message="AI tạm thời không khả dụng. EatFitAI đã dùng công thức chuẩn để tính mục tiêu.",
        )
    except Exception as exc:
        logger.error("Nutrition advice failed unexpectedly, using formula fallback: %s", exc)
        return _build_formula_result(
            gender,
            age,
            height_cm,
            weight_kg,
            activity_level,
            goal,
            message="AI đang bận. EatFitAI đã dùng công thức chuẩn để tính mục tiêu.",
        )


# ============== MEAL INSIGHT ==============

def get_meal_insight(
    meal_items: list, total_calories: int, target_calories: int,
    current_macros: Dict[str, int], target_macros: Dict[str, int],
    user_history: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """AI insight về bữa ăn (Gemini hoặc fallback)"""
    try:
        ensure_gemini_service_available()
    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning("Meal insight fallback due to Gemini unavailable: %s", exc)
        cal_pct = (total_calories / target_calories * 100) if target_calories > 0 else 0
        return _meal_insight_fallback(
            cal_pct,
            total_calories,
            target_calories,
            current_macros,
            target_macros,
        )
    
    items_str = ", ".join([f"{item.get('name', 'Unknown')}" for item in meal_items[:5]])
    cal_pct = (total_calories / target_calories * 100) if target_calories > 0 else 0
    protein_current = current_macros.get('protein', 0)
    protein_target = target_macros.get('protein', 0)
    
    prompt = f"""Phân tích dinh dưỡng ngắn gọn:
- Món đã ăn: {items_str}
- Calories: {total_calories}/{target_calories} kcal ({cal_pct:.0f}%)
- Protein: {protein_current}/{protein_target}g
- Carbs: {current_macros.get('carbs', 0)}g, Fat: {current_macros.get('fat', 0)}g

TRẢ LỜI JSON:
{{"insight": "nhận xét 1-2 câu", "score": 1-10, "suggestions": ["gợi ý 1", "gợi ý 2"]}}"""

    response = query_gemini(prompt, cache_ttl=120)
    
    if response:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["source"] = "gemini"
                if "score" not in result:
                    result["score"] = 7
                return result
        except:
            pass
    
    return _meal_insight_fallback(cal_pct, total_calories, target_calories, current_macros, target_macros)


def _meal_insight_fallback(cal_pct, total_calories, target_calories, current_macros, target_macros):
    """Fallback logic cho meal insight"""
    protein_pct = (current_macros.get('protein', 0) / target_macros.get('protein', 1) * 100) if target_macros.get('protein', 0) > 0 else 0
    
    if cal_pct >= 115:
        return {"insight": f"Bạn đã vượt {cal_pct - 100:.0f}% mục tiêu. Hạn chế ăn thêm.", "score": 6, "suggestions": ["Uống nước thay đồ uống có đường", "Tập nhẹ 20-30 phút"], "source": "fallback"}
    elif cal_pct < 50:
        return {"insight": f"Mới ăn {cal_pct:.0f}% mục tiêu. Đừng quên ăn đủ bữa!", "score": 5, "suggestions": ["Ăn thêm bữa chính đầy đủ", "Bổ sung rau xanh và protein"], "source": "fallback"}
    elif cal_pct < 85:
        remaining = target_calories - total_calories
        suggestions = [f"Cần thêm khoảng {remaining}kcal"]
        if protein_pct < 80:
            suggestions.append("Ưu tiên thêm protein (thịt, trứng, cá)")
        return {"insight": f"Còn {remaining}kcal để đạt mục tiêu.", "score": 6, "suggestions": suggestions, "source": "fallback"}
    else:
        return {"insight": f"Tuyệt vời! Bạn đang theo dõi tốt ({cal_pct:.0f}% mục tiêu).", "score": 8, "suggestions": ["Giữ vững nhịp này!"], "source": "fallback"}


# ============== COOKING INSTRUCTIONS ==============

RECIPE_GUIDE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "steps": {"type": "array", "items": {"type": "string"}},
        "cookingTimeMinutes": {"type": "integer"},
        "difficulty": {"type": "string"},
        "tips": {"type": "array", "items": {"type": "string"}},
        "sourceUrls": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["steps", "cookingTimeMinutes", "difficulty", "tips", "sourceUrls"],
}

DEFAULT_TRUSTED_RECIPE_DOMAINS = {
    "allrecipes.com",
    "bbcgoodfood.com",
    "cookpad.com",
    "dienmayxanh.com",
    "foodnetwork.com",
    "monngonmoingay.com",
    "suckhoedoisong.vn",
    "taste.com.au",
    "vnexpress.net",
}


def _csv_env_set(name: str, defaults: Optional[set[str]] = None) -> set[str]:
    raw = os.getenv(name, "").strip()
    if not raw:
        return set(defaults or set())
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def _recipe_cache_ttl_seconds() -> int:
    try:
        hours = int(os.getenv("RECIPE_RESEARCH_CACHE_TTL_HOURS", "168"))
    except ValueError:
        hours = 168
    return max(1, min(hours, 24 * 30)) * 3600


def _is_enabled_env(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).strip().lower() not in {"0", "false", "no", "off"}


def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start:end])
    except json.JSONDecodeError as exc:
        logger.warning("Failed to parse recipe guide JSON: %s", exc)
        return None
    return parsed if isinstance(parsed, dict) else None


def _coerce_string_list(value: Any, *, max_items: int = 8) -> list[str]:
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        text = str(item or "").strip()
        if text:
            result.append(text)
        if len(result) >= max_items:
            break
    return result


def _coerce_positive_int(value: Any) -> Optional[int]:
    if isinstance(value, bool) or value is None:
        return None
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        match = re.search(r"\d+", str(value))
        if not match:
            return None
        number = int(match.group(0))
    return number if number > 0 else None


def _is_trusted_source_url(url: str) -> bool:
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False

    if parsed.scheme != "https" or not parsed.netloc:
        return False

    host = parsed.netloc.lower().split("@")[-1].split(":")[0]
    trusted_domains = _csv_env_set("TRUSTED_RECIPE_DOMAINS", DEFAULT_TRUSTED_RECIPE_DOMAINS)
    return any(host == domain or host.endswith(f".{domain}") for domain in trusted_domains)


def _trusted_source_urls(source_urls: Any) -> list[str]:
    urls = _coerce_string_list(source_urls, max_items=5)
    trusted: list[str] = []
    for url in urls:
        if _is_trusted_source_url(url) and url not in trusted:
            trusted.append(url)
    return trusted


def _recipe_tools() -> list[Dict[str, Any]]:
    if not _is_enabled_env("GEMINI_SEARCH_GROUNDING_ENABLED", "true"):
        return []
    return [{"google_search": {}}, {"url_context": {}}]


def _build_recipe_guide_prompt(recipe_name: str, ingredients: list[dict], description: str) -> str:
    ingredients_str = ", ".join(
        f"{ing.get('foodName', 'nguyên liệu')} ({ing.get('grams', 100)}g)"
        for ing in ingredients[:12]
    )
    trusted_domains = ", ".join(sorted(_csv_env_set("TRUSTED_RECIPE_DOMAINS", DEFAULT_TRUSTED_RECIPE_DOMAINS))[:12])
    return f"""Bạn là đầu bếp EatFitAI. Tạo hướng dẫn nấu an toàn, thực tế, ngắn gọn cho người Việt.

MÓN: "{recipe_name}"
NGUYÊN LIỆU DB: {ingredients_str}
{f"MÔ TẢ DB: {description}" if description else ""}

YÊU CẦU:
- Chỉ dùng các nguồn công thức/cooking đáng tin cậy; ưu tiên các domain: {trusted_domains}.
- Không tự bịa URL. sourceUrls phải là URL https thật từ nguồn đã tham khảo.
- Không thay đổi định lượng dinh dưỡng; backend đã quyết định macro.
- Viết tiếng Việt tự nhiên, tránh quảng cáo và tránh lời khuyên y tế.
- 3-7 bước, mỗi bước đủ rõ để nấu được trên bếp gia đình.

CHỈ trả lời JSON hợp lệ:
{{"steps":["..."],"cookingTimeMinutes":25,"difficulty":"Dễ","tips":["..."],"sourceUrls":["https://..."]}}"""


def _normalize_search_text(value: str) -> str:
    folded = unicodedata.normalize("NFD", value.lower())
    folded = "".join(ch for ch in folded if unicodedata.category(ch) != "Mn").replace("đ", "d")
    return re.sub(r"[^a-z0-9]+", " ", folded).strip()


def _title_relevance_score(recipe_name: str, title: str, channel_title: str) -> float:
    recipe_tokens = {token for token in _normalize_search_text(recipe_name).split() if len(token) >= 2}
    text = _normalize_search_text(f"{title} {channel_title}")
    if not recipe_tokens:
        return 0.0
    overlap = sum(1 for token in recipe_tokens if token in text)
    score = overlap / max(1, len(recipe_tokens))
    if any(token in text for token in ("cach nau", "cong thuc", "mon ngon", "healthy", "eat clean")):
        score += 0.35
    return score


def _safe_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _find_youtube_video(recipe_name: str) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("YOUTUBE_DATA_API_KEY", "").strip()
    if not api_key:
        return None

    trusted_channel_ids = _csv_env_set("TRUSTED_YOUTUBE_CHANNEL_IDS")
    try:
        search_response = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": f"cách nấu {recipe_name}",
                "type": "video",
                "maxResults": 5,
                "order": "relevance",
                "relevanceLanguage": "vi",
                "safeSearch": "moderate",
                "key": api_key,
            },
            timeout=8,
        )
        search_response.raise_for_status()
        search_items = search_response.json().get("items", [])
        video_ids = [
            item.get("id", {}).get("videoId")
            for item in search_items
            if item.get("id", {}).get("videoId")
        ]
        if not video_ids:
            return None

        videos_response = requests.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "snippet,statistics",
                "id": ",".join(video_ids[:5]),
                "key": api_key,
            },
            timeout=8,
        )
        videos_response.raise_for_status()
        videos = videos_response.json().get("items", [])
    except requests.RequestException as exc:
        logger.warning("YouTube recipe lookup failed: %s", exc)
        return None

    best: Optional[Dict[str, Any]] = None
    best_score = 0.0
    for item in videos:
        snippet = item.get("snippet", {})
        channel_id = str(snippet.get("channelId") or "").strip()
        if trusted_channel_ids and channel_id.lower() not in trusted_channel_ids:
            continue

        title = str(snippet.get("title") or "").strip()
        channel_title = str(snippet.get("channelTitle") or "").strip()
        relevance = _title_relevance_score(recipe_name, title, channel_title)
        views = _safe_int(item.get("statistics", {}).get("viewCount"))
        trust_bonus = 1.0 if channel_id.lower() in trusted_channel_ids else 0.0
        score = relevance + trust_bonus + min(0.35, views / 1_000_000)
        if score > best_score:
            thumbnails = snippet.get("thumbnails", {}) or {}
            thumb = (
                thumbnails.get("high")
                or thumbnails.get("medium")
                or thumbnails.get("default")
                or {}
            ).get("url")
            video_id = item.get("id")
            best = {
                "videoId": video_id,
                "title": title,
                "channelTitle": channel_title,
                "channelId": channel_id,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "thumbnailUrl": thumb,
                "trustScore": round(score, 3),
            }
            best_score = score

    min_score = 1.15 if trusted_channel_ids else 0.85
    return best if best and best_score >= min_score else None


def get_cooking_guide(
    recipe_name: str, ingredients: list[dict], description: str = ""
) -> Dict[str, Any]:
    """Generate grounded cooking guide with source validation and optional YouTube candidate."""
    try:
        ensure_gemini_service_available()
    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning("Recipe guide fallback due to Gemini unavailable: %s", exc)
        fallback = _generate_fallback_instructions(recipe_name, ingredients)
        fallback["guideStatus"] = "fallback"
        fallback["sourceUrls"] = []
        fallback["youtubeVideo"] = None
        fallback["cookingTimeMinutes"] = _coerce_positive_int(fallback.get("cookingTime")) or 25
        return fallback

    response = query_gemini(
        _build_recipe_guide_prompt(recipe_name, ingredients, description),
        cache_ttl=_recipe_cache_ttl_seconds(),
        response_schema=RECIPE_GUIDE_SCHEMA,
        thinking_budget=0,
        tools=_recipe_tools(),
    )

    if response:
        parsed = _extract_json_object(response)
        if parsed:
            steps = _coerce_string_list(parsed.get("steps"), max_items=7)
            source_urls = _trusted_source_urls(parsed.get("sourceUrls"))
            if len(steps) >= 3 and source_urls:
                return {
                    "recipeName": recipe_name,
                    "steps": steps,
                    "cookingTimeMinutes": _coerce_positive_int(parsed.get("cookingTimeMinutes")) or 25,
                    "difficulty": str(parsed.get("difficulty") or "Dễ").strip(),
                    "tips": _coerce_string_list(parsed.get("tips"), max_items=5),
                    "sourceUrls": source_urls,
                    "youtubeVideo": _find_youtube_video(recipe_name),
                    "guideStatus": "generated",
                    "source": "gemini_grounded",
                }

            logger.warning(
                "Rejected recipe guide without enough steps or trusted sources recipe=%s steps=%s sources=%s",
                recipe_name,
                len(steps),
                len(source_urls),
            )

    fallback = _generate_fallback_instructions(recipe_name, ingredients)
    fallback["guideStatus"] = "fallback"
    fallback["sourceUrls"] = []
    fallback["youtubeVideo"] = None
    fallback["cookingTimeMinutes"] = _coerce_positive_int(fallback.get("cookingTime")) or 25
    return fallback


def get_cooking_instructions(
    recipe_name: str, ingredients: list[dict], description: str = ""
) -> Dict[str, Any]:
    """Backward-compatible cooking instruction shape for older backend/mobile clients."""
    guide = get_cooking_guide(recipe_name, ingredients, description)
    minutes = _coerce_positive_int(guide.get("cookingTimeMinutes")) or 25
    return {
        "steps": guide.get("steps", []),
        "cookingTime": f"{minutes} phút",
        "difficulty": guide.get("difficulty", "Dễ"),
        "tips": guide.get("tips", []),
        "source": guide.get("source", guide.get("guideStatus", "fallback")),
        "sourceUrls": guide.get("sourceUrls", []),
        "youtubeVideo": guide.get("youtubeVideo"),
    }


def _generate_fallback_instructions(recipe_name: str, ingredients: list[dict]) -> Dict[str, Any]:
    """Hướng dẫn nấu ăn mặc định khi Gemini không khả dụng"""
    ing_names = [ing.get('foodName', 'nguyên liệu') for ing in ingredients[:5]]
    
    return {
        "steps": [
            f"Sơ chế và rửa sạch: {', '.join(ing_names)}",
            "Cắt hoặc thái theo kích thước phù hợp",
            "Cho dầu ăn vào chảo, đun nóng ở lửa vừa",
            "Cho nguyên liệu vào chảo theo thứ tự, đảo đều",
            "Nêm gia vị theo khẩu vị (muối, tiêu, nước mắm)",
            f"Trang trí và thưởng thức {recipe_name}"
        ],
        "cookingTime": "20-30 phút",
        "difficulty": "Trung bình",
        "source": "fallback",
        "note": "AI đang bận, vui lòng thử lại sau để có hướng dẫn chi tiết hơn"
    }


# ============== VOICE COMMAND PARSING ==============

# Mapping số chữ sang số (giữ nguyên logic cũ)
def parse_vietnamese_number(text: str) -> int:
    """Parse số tiếng Việt sang int. VD: 'hai nghìn sáu trăm' -> 2600"""
    text = text.lower().strip()
    if text.isdigit():
        return int(text)
    
    result = 0
    
    # Tìm NGHÌN
    thousands_map = {
        "một nghìn": 1000, "hai nghìn": 2000, "ba nghìn": 3000, "bốn nghìn": 4000,
        "năm nghìn": 5000, "sáu nghìn": 6000, "bảy nghìn": 7000, "tám nghìn": 8000, "chín nghìn": 9000,
        "một ngàn": 1000, "hai ngàn": 2000, "ba ngàn": 3000, "bốn ngàn": 4000,
        "năm ngàn": 5000, "sáu ngàn": 6000, "bảy ngàn": 7000, "tám ngàn": 8000, "chín ngàn": 9000,
    }
    for word, val in thousands_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # Tìm TRĂM
    hundreds_map = {
        "một trăm": 100, "hai trăm": 200, "ba trăm": 300, "bốn trăm": 400,
        "năm trăm": 500, "sáu trăm": 600, "bảy trăm": 700, "tám trăm": 800, "chín trăm": 900
    }
    for word, val in hundreds_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # Tìm CHỤC
    tens_map = {
        "mười": 10, "hai mươi": 20, "ba mươi": 30, "bốn mươi": 40,
        "năm mươi": 50, "sáu mươi": 60, "bảy mươi": 70, "tám mươi": 80, "chín mươi": 90
    }
    for word, val in tens_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # Tìm ĐƠN VỊ
    text = text.replace("lăm", "năm").replace("mốt", "một")
    text = text.replace("linh", "").replace("lẻ", "").strip()
    
    units_map = {
        "một": 1, "hai": 2, "ba": 3, "bốn": 4, "năm": 5,
        "sáu": 6, "bảy": 7, "tám": 8, "chín": 9
    }
    for word, val in units_map.items():
        if word in text:
            result += val
            break
    
    return result if result > 0 else 0


def preprocess_vietnamese_numbers(text: str) -> str:
    """Tiền xử lý: Chuyển số tiếng Việt thành số digit."""
    number_words = r"((?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín)\s*(?:nghìn|ngàn)(?:\s*(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín)\s*trăm)?(?:\s*(?:linh|lẻ)?\s*(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mươi|lăm|mốt))*|(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín)\s*trăm(?:\s*(?:linh|lẻ)?\s*(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mươi|lăm|mốt))*|(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s*(?:mươi|mười)?(?:\s*(?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|lăm|mốt))?)"
    unit_words = r"\s*(gam|g|gram|ký|kg|kilogram|calo|calories|kcal)"
    
    pattern = number_words + unit_words
    
    def replace_number(match):
        number_text = match.group(1)
        unit = match.group(2)
        parsed = parse_vietnamese_number(number_text)
        if parsed > 0:
            return f"{parsed}{unit}"
        return match.group(0)
    
    result = re.sub(pattern, replace_number, text.lower(), flags=re.IGNORECASE)
    return result


def _fold_vietnamese_text(text: str) -> str:
    folded = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in folded if unicodedata.category(ch) != "Mn").replace("đ", "d")


def try_parse_weight_regex(text: str) -> Dict[str, Any] | None:
    """Regex để parse LOG_WEIGHT."""
    lower = _fold_vietnamese_text(text).strip()
    
    if "calo" in lower or "calories" in lower or "kcal" in lower:
        return None
    
    pattern_number = r"(?:can nang|toi|nang)\s*(?:la\s+)?(\d+(?:\.\d+)?)\s*(?:ky|kg|kilogram)?"
    match = re.search(pattern_number, lower, re.IGNORECASE)
    if match:
        weight = float(match.group(1))
        if 30 <= weight <= 200:
            return {
                "intent": "LOG_WEIGHT",
                "entities": {"weight": weight},
                "confidence": 0.95,
                "rawText": text,
                "source": "regex"
            }
    
    pattern_text = r"(?:can nang|toi|nang)\s*((?:mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi|muoi|lam|mot|tram|linh|le|\s)+)\s*(?:ky|kg|kilogram)"
    match = re.search(pattern_text, lower, re.IGNORECASE)
    if match:
        weight = parse_vietnamese_number(match.group(1))
        if weight == 0 and "một trăm" in lower:
            weight = 100
        if 30 <= weight <= 200:
            return {
                "intent": "LOG_WEIGHT",
                "entities": {"weight": weight},
                "confidence": 0.9,
                "rawText": text,
                "source": "regex"
            }
    
    return None


def try_parse_ask_calories_regex(text: str) -> Dict[str, Any] | None:
    """Regex để parse ASK_CALORIES."""
    lower = _fold_vietnamese_text(text).strip()
    
    pattern = r"(?:an|tieu thu|nap|uong)?\s*(?:duoc\s+|da\s+)?(?:bao nhieu|tong|het|may)\s*(?:calo|calories|kcal|nang luong)"
    
    if re.search(pattern, lower, re.IGNORECASE):
        return {
            "intent": "ASK_CALORIES",
            "entities": {},
            "confidence": 0.95,
            "rawText": text,
            "source": "regex"
        }
    
    return None


def try_parse_add_food_regex(text: str) -> Dict[str, Any] | None:
    """Regex cho lệnh ADD_FOOD ngắn, bao gồm câu không dấu trong smoke."""
    lower = _fold_vietnamese_text(text).strip()

    pattern = (
        r"^(?:ghi|them|an|log)\s+"
        r"(?:(\d+(?:[\.,]\d+)?)\s+)?"
        r"(.+?)"
        r"(?:\s+(?:vao|cho|trong)\s+((?:bua\s+)?(?:sang|trua|toi|phu)|snack))?$"
    )
    match = re.search(pattern, lower, re.IGNORECASE)
    if not match:
        return None

    quantity_text, food_name, meal_text = match.groups()
    food_name = (food_name or "").strip()
    if not food_name:
        return None

    meal_type = None
    normalized_meal = (meal_text or "").strip()
    if normalized_meal in {"sang", "bua sang"}:
        meal_type = "Breakfast"
    elif normalized_meal in {"trua", "bua trua"}:
        meal_type = "Lunch"
    elif normalized_meal in {"toi", "bua toi"}:
        meal_type = "Dinner"
    elif normalized_meal in {"phu", "bua phu", "snack"}:
        meal_type = "Snack"

    quantity = 1.0
    if quantity_text:
        try:
            quantity = float(quantity_text.replace(",", "."))
        except ValueError:
            quantity = 1.0

    entities: Dict[str, Any] = {
        "foodName": food_name,
        "quantity": quantity,
    }
    if meal_type:
        entities["mealType"] = meal_type

    return {
        "intent": "ADD_FOOD",
        "entities": entities,
        "confidence": 0.85,
        "rawText": text,
        "source": "regex",
    }


def parse_voice_command_llm(text: str) -> Dict[str, Any]:
    """
    Parse Vietnamese voice command: regex trước, Gemini LLM fallback.
    Đổi tên từ parse_voice_command_ollama → parse_voice_command_llm
    """
    
    # Bước 1: Regex pre-processing
    weight_result = try_parse_weight_regex(text)
    if weight_result:
        logger.info(f"Voice parsed by REGEX: LOG_WEIGHT")
        return weight_result
    
    calories_result = try_parse_ask_calories_regex(text)
    if calories_result:
        logger.info(f"Voice parsed by REGEX: ASK_CALORIES")
        return calories_result

    add_food_result = try_parse_add_food_regex(text)
    if add_food_result:
        logger.info("Voice parsed by REGEX: ADD_FOOD")
        return add_food_result
    
    # Bước 2: Gemini LLM cho ADD_FOOD và complex cases
    ensure_gemini_service_available()
    if False:
        return {
            "intent": "UNKNOWN", "entities": {}, "confidence": 0.0,
            "rawText": text, "source": "fallback",
            "error": "Gemini API không khả dụng"
        }
    
    processed_text = preprocess_vietnamese_numbers(text)
    
    prompt = f"""Phân tích lệnh giọng nói tiếng Việt cho app calories.

LỆNH: "{processed_text}"

INTENT (chọn 1):
- ADD_FOOD: có TÊN MÓN ĂN cụ thể
- LOG_WEIGHT: có số + ký/kg
- ASK_CALORIES: hỏi "bao nhiêu calo"
- UNKNOWN: không khớp

VÍ DỤ:
"thêm 150g thịt heo bữa trưa" → {{"intent":"ADD_FOOD","entities":{{"foodName":"thịt heo","weight":150,"mealType":"lunch"}},"confidence":0.95}}
"ăn 1 bát phở và 1 ly trà đá" → {{"intent":"ADD_FOOD","entities":{{"foods":[{{"foodName":"phở","quantity":1,"unit":"bát"}},{{"foodName":"trà đá","quantity":1,"unit":"ly"}}]}},"confidence":0.9}}

CHỈ trả lời JSON hợp lệ:"""

    try:
        response = query_gemini(prompt, use_cache=False)
        
        if response:
            start = response.find("{")
            end = response.rfind("}") + 1
            
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["rawText"] = text
                result["source"] = "gemini"
                
                if "intent" not in result:
                    result["intent"] = "UNKNOWN"
                if "entities" not in result:
                    result["entities"] = {}
                if "confidence" not in result:
                    result["confidence"] = 0.5
                
                # Anti-hallucination: loại bỏ món không có trong input
                if result["intent"] == "ADD_FOOD":
                    text_lower = text.lower()
                    
                    if "foods" in result.get("entities", {}):
                        valid_foods = []
                        for food in result["entities"]["foods"]:
                            food_name = food.get("foodName", "").lower()
                            if food_name and food_name in text_lower:
                                valid_foods.append(food)
                            else:
                                logger.warning(f"Filtered hallucinated food: {food_name}")
                        
                        if valid_foods:
                            result["entities"]["foods"] = valid_foods
                        else:
                            result["intent"] = "UNKNOWN"
                            result["confidence"] = 0.3
                    
                    elif "foodName" in result.get("entities", {}):
                        food_name = result["entities"]["foodName"].lower()
                        if food_name not in text_lower:
                            logger.warning(f"Filtered hallucinated food: {food_name}")
                            result["intent"] = "UNKNOWN"
                            result["confidence"] = 0.3
                
                logger.info(f"Voice parsed: intent={result['intent']}")
                return result
                
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
    except Exception as e:
        logger.error(f"Voice parsing error: {e}")
    
    return {
        "intent": "UNKNOWN", "entities": {}, "confidence": 0.0,
        "rawText": text, "source": "fallback",
        "error": "Không thể phân tích lệnh"
    }
