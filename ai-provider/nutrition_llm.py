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
from typing import Any, Dict, Optional

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
        _gemini_pool = GeminiPoolManager.from_env()
    return _gemini_pool


def get_gemini_runtime_status() -> Dict[str, Any]:
    """Expose runtime Gemini model/pool metadata for health reporting."""
    return _get_gemini_pool().get_runtime_status()


def ensure_gemini_service_available() -> Dict[str, Any]:
    """Raise when Gemini service is unavailable or quota-exhausted."""
    pool = _get_gemini_pool()
    pool.ensure_service_available()
    return pool.get_runtime_status()

def _init_gemini():
    """Khởi tạo Gemini client (lazy init)"""
    return is_gemini_available()
    global _gemini_model
    if _gemini_model is not None:
        return True
    
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY chưa được cấu hình")
        return False
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(GEMINI_MODEL)
        logger.info(f"✅ Gemini API initialized (model: {GEMINI_MODEL})")
        return True
    except Exception as e:
        logger.error(f"❌ Gemini init failed: {e}")
        return False

def is_gemini_available() -> bool:
    """Kiểm tra Gemini API có sẵn sàng không"""
    try:
        return _get_gemini_pool().has_available_entry()
    except Exception as exc:
        logger.error(f"Gemini availability check failed: {exc}")
        return False

def query_gemini(prompt: str, use_cache: bool = True, cache_ttl: int = None) -> Optional[str]:
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
    
    # Goal adjustment
    if goal.lower() in ["lose", "weight_loss", "giam_can", "giảm cân"]:
        calories = int(tdee * 0.85)
    elif goal.lower() in ["gain", "weight_gain", "tang_can", "tăng cân"]:
        calories = int(tdee * 1.15)
    else:
        calories = int(tdee)
    
    # Macro distribution: Protein 25%, Carbs 50%, Fat 25%
    protein = int(calories * 0.25 / 4)
    carbs = int(calories * 0.50 / 4)
    fat = int(calories * 0.25 / 9)
    
    logger.info(f"Formula calculated: cal={calories}, p={protein}, c={carbs}, f={fat}")
    
    goal_explanations = {
        "lose": f"Giảm 15% TDEE ({int(tdee)}→{calories}kcal) để giảm cân an toàn. Protein cao giữ cơ bắp.",
        "weight_loss": f"Giảm 15% TDEE để giảm cân. Duy trì protein {protein}g/ngày để tránh mất cơ.",
        "gain": f"Tăng 15% TDEE ({int(tdee)}→{calories}kcal) để tăng cân. Carbs cao hỗ trợ tập luyện.",
        "weight_gain": f"Tăng 15% TDEE để tăng cơ. Protein {protein}g, Carbs {carbs}g cho năng lượng.",
        "maintain": f"Duy trì TDEE {calories}kcal. Phân bổ chuẩn: 25% Protein, 50% Carbs, 25% Fat."
    }
    explanation = goal_explanations.get(goal.lower(), f"TDEE {calories}kcal. Macro ratio: P25% C50% F25%.")
    
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
- lose: TDEE×0.85, maintain: TDEE×1.0, gain: TDEE×1.15
- Macro: Protein 25% (÷4), Carbs 50% (÷4), Fat 25% (÷9)

THÔNG TIN: {gender}, {age} tuổi, {height_cm}cm, {weight_kg}kg, {activity_level}, {goal}

TRẢ LỜI JSON (chỉ JSON, không giải thích thêm):
{{"calories": int, "protein": int, "carbs": int, "fat": int, "explanation": "giải thích ngắn gọn"}}"""

    response = query_gemini(prompt, cache_ttl=600)
    
    if response:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                
                calories = int(result.get("calories", 0))
                protein = int(result.get("protein", 0))
                carbs = int(result.get("carbs", 0))
                fat = int(result.get("fat", 0))
                
                # Validation: nếu giá trị bất hợp lý → fallback formula
                if carbs < 50 or calories < 1000 or protein < 30:
                    logger.warning(f"Gemini trả về kết quả không hợp lý: cal={calories}, p={protein}, c={carbs}")
                    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
                    result["source"] = "formula_validated"
                    return result
                
                result["source"] = "gemini"
                result["calories"] = calories
                result["protein"] = protein
                result["carbs"] = carbs
                result["fat"] = fat
                return result
                
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Gemini response: {response[:100]}")
    
    # Fallback to formula
    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    result["source"] = "formula"
    return result


# ============== MAIN FUNCTION ==============

def get_nutrition_advice(
    gender: str, age: int, height_cm: float, weight_kg: float,
    activity_level: str, goal: str
) -> Dict[str, Any]:
    """Main function: Gemini first, fallback formula"""
    
    ensure_gemini_service_available()
    logger.info("Using Gemini API")
    return get_nutrition_advice_gemini(gender, age, height_cm, weight_kg, activity_level, goal)
    
    logger.info("Gemini not available, using Mifflin-St Jeor formula")
    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    result["source"] = "formula"
    result["explanation"] = "Sử dụng công thức Mifflin-St Jeor (chuẩn y khoa) - AI tạm thời không khả dụng"
    return result


# ============== MEAL INSIGHT ==============

def get_meal_insight(
    meal_items: list, total_calories: int, target_calories: int,
    current_macros: Dict[str, int], target_macros: Dict[str, int],
    user_history: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """AI insight về bữa ăn (Gemini hoặc fallback)"""
    
    ensure_gemini_service_available()
    
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

def get_cooking_instructions(
    recipe_name: str, ingredients: list[dict], description: str = ""
) -> Dict[str, Any]:
    """Generate hướng dẫn nấu ăn bằng Gemini AI"""
    
    ensure_gemini_service_available()
    
    ingredients_str = ", ".join([
        f"{ing.get('foodName', 'Unknown')} ({ing.get('grams', 100)}g)"
        for ing in ingredients
    ])
    
    prompt = f"""Bạn là đầu bếp chuyên nghiệp. Hướng dẫn nấu chi tiết:

MÓN: "{recipe_name}"
NGUYÊN LIỆU: {ingredients_str}
{f"MÔ TẢ: {description}" if description else ""}

TRẢ LỜI JSON:
{{"steps": ["bước 1 chi tiết...", "bước 2..."], "cookingTime": "X phút", "difficulty": "Dễ/Trung bình/Khó", "tips": ["mẹo 1", "mẹo 2"]}}"""

    response = query_gemini(prompt, cache_ttl=600)
    
    if response:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["source"] = "gemini"
                if "steps" in result and len(result["steps"]) >= 3:
                    return result
        except Exception as e:
            logger.error(f"Error parsing cooking instructions: {e}")
    
    return _generate_fallback_instructions(recipe_name, ingredients)


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


def try_parse_weight_regex(text: str) -> Dict[str, Any] | None:
    """Regex để parse LOG_WEIGHT."""
    lower = text.lower().strip()
    
    if "calo" in lower or "calories" in lower or "kcal" in lower:
        return None
    
    pattern_number = r"(?:cân nặng|tôi|nặng)\s*(?:là\s+)?(\d+(?:\.\d+)?)\s*(?:ký|kg|kilogram)?"
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
    
    pattern_text = r"(?:cân nặng|tôi|nặng)\s*((?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mươi|lăm|mốt|trăm|linh|lẻ|\s)+)\s*(?:ký|kg|kilogram)"
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
    lower = text.lower().strip()
    
    pattern = r"(?:ăn|tiêu thụ|nạp|uống)?\s*(?:được\s+|đã\s+)?(?:bao nhiêu|tổng|hết|mấy)\s*(?:calo|calories|kcal|năng lượng)"
    
    if re.search(pattern, lower, re.IGNORECASE):
        return {
            "intent": "ASK_CALORIES",
            "entities": {},
            "confidence": 0.95,
            "rawText": text,
            "source": "regex"
        }
    
    return None


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
