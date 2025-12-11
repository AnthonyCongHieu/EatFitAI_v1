"""
Nutrition LLM Service - Powered by Ollama (Local) or Gemini (Cloud)
Provides AI-powered nutrition advice and meal insights
"""

from __future__ import annotations
import os
import json
import logging
import requests
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Check which LLM is available
def check_ollama_available() -> bool:
    """Check if Ollama is running and accessible"""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        return response.status_code == 200
    except:
        return False

OLLAMA_AVAILABLE = check_ollama_available()
logger.info(f"Ollama available: {OLLAMA_AVAILABLE}")


# ============== LLM RESPONSE CACHE ==============
import hashlib
from functools import lru_cache
from collections import OrderedDict
import threading

class LLMCache:
    """Thread-safe LRU cache for LLM responses"""
    def __init__(self, maxsize: int = 100):
        self.cache: OrderedDict[str, Dict] = OrderedDict()
        self.maxsize = maxsize
        self.lock = threading.Lock()
        self.hits = 0
        self.misses = 0
    
    def _make_key(self, *args) -> str:
        """Tạo cache key từ input parameters"""
        key_str = "|".join(str(arg) for arg in args)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Dict]:
        with self.lock:
            if key in self.cache:
                self.hits += 1
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                logger.debug(f"Cache HIT: {key[:8]}... (hits: {self.hits})")
                return self.cache[key]
            self.misses += 1
            return None
    
    def set(self, key: str, value: Dict) -> None:
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            else:
                if len(self.cache) >= self.maxsize:
                    # Remove oldest item
                    self.cache.popitem(last=False)
                self.cache[key] = value
    
    def stats(self) -> Dict[str, int]:
        return {"hits": self.hits, "misses": self.misses, "size": len(self.cache)}

# Global cache instances
nutrition_cache = LLMCache(maxsize=100)
cooking_cache = LLMCache(maxsize=50)


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
        calories = int(tdee * 0.85)  # 15% deficit
    elif goal.lower() in ["gain", "weight_gain", "tang_can", "tăng cân"]:
        calories = int(tdee * 1.15)  # 15% surplus
    else:
        calories = int(tdee)
    
    # Macro distribution theo tỷ lệ chuẩn
    # Protein: 25%, Carbs: 50%, Fat: 25%
    protein = int(calories * 0.25 / 4)  # 25% calories from protein (4 kcal/g)
    carbs = int(calories * 0.50 / 4)    # 50% calories from carbs (4 kcal/g)
    fat = int(calories * 0.25 / 9)      # 25% calories from fat (9 kcal/g)
    
    # Logging để debug
    logger.info(f"Formula calculated: cal={calories}, p={protein}, c={carbs}, f={fat}")
    
    # Tạo explanation dựa trên goal
    goal_explanations = {
        "lose": f"Giảm 15% TDEE ({int(tdee)}→{calories}kcal) để giảm cân an toàn. Protein cao giữ cơ bắp.",
        "weight_loss": f"Giảm 15% TDEE để giảm cân. Duy trì protein {protein}g/ngày để tránh mất cơ.",
        "giam_can": f"Giảm 15% năng lượng hàng ngày. Carbs {carbs}g đủ cho hoạt động cơ bản.",
        "gain": f"Tăng 15% TDEE ({int(tdee)}→{calories}kcal) để tăng cân. Carbs cao hỗ trợ tập luyện.",
        "weight_gain": f"Tăng 15% TDEE để tăng cơ. Protein {protein}g, Carbs {carbs}g cho năng lượng.",
        "tang_can": f"Tăng 15% năng lượng. Ưu tiên carbs {carbs}g để hỗ trợ phát triển cơ.",
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


# ============== OLLAMA LOCAL LLM ==============

def query_ollama(prompt: str, model: str = None) -> Optional[str]:
    """
    Query Ollama local LLM
    Returns None if failed
    """
    if not OLLAMA_AVAILABLE:
        return None
    
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model or OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Chút ngẫu nhiên để có sự đa dạng
                    "num_predict": 200  # Limit response length for speed
                }
            },
            timeout=30  # 30 second timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get("response", "")
        else:
            logger.error(f"Ollama error: {response.status_code}")
            return None
            
    except requests.exceptions.Timeout:
        logger.error("Ollama timeout")
        return None
    except Exception as e:
        logger.error(f"Ollama query failed: {e}")
        return None


def get_nutrition_advice_ollama(
    gender: str,
    age: int,
    height_cm: float,
    weight_kg: float,
    activity_level: str,
    goal: str
) -> Dict[str, Any]:
    """
    Get nutrition advice from Ollama local LLM
    Sử dụng Chain-of-Thought + Few-shot prompting để đảm bảo kết quả chính xác
    """
    # Prompt với hướng dẫn tính toán chi tiết
    prompt = f"""Bạn là chuyên gia dinh dưỡng. Tính mục tiêu dinh dưỡng hàng ngày CHÍNH XÁC.

CÔNG THỨC TÍNH:
1. BMR (Mifflin-St Jeor):
   - Nam: BMR = 10 × cân_nặng + 6.25 × chiều_cao - 5 × tuổi + 5
   - Nữ: BMR = 10 × cân_nặng + 6.25 × chiều_cao - 5 × tuổi - 161

2. TDEE = BMR × Activity Multiplier:
   - sedentary/Ít vận động: 1.2
   - light/Nhẹ nhàng: 1.375
   - moderate/Vừa phải: 1.55
   - active/Tích cực: 1.725
   - very_active/Rất tích cực: 1.9

3. Điều chỉnh theo mục tiêu:
   - lose/Giảm cân: TDEE × 0.85 (-15%)
   - maintain/Duy trì: TDEE × 1.0
   - gain/Tăng cân: TDEE × 1.15 (+15%)

4. Phân bổ Macro (% calories):
   - Protein: 25% (chia 4 để ra gram)
   - Carbs: 50% (chia 4 để ra gram)
   - Fat: 25% (chia 9 để ra gram)

VÍ DỤ - Nam, 25 tuổi, 170cm, 65kg, moderate, maintain:
Output: {{"calories": 2461, "protein": 154, "carbs": 307, "fat": 68, "explanation": "BMR của bạn là 1588kcal. Với mức vận động vừa phải (x1.55), TDEE = 2461kcal. Để duy trì cân nặng, bạn cần 2461kcal/ngày với 154g protein để duy trì cơ bắp."}}

THÔNG TIN NGƯỜI DÙNG: {gender}, {age} tuổi, {height_cm}cm, {weight_kg}kg, mức vận động: {activity_level}, mục tiêu: {goal}

TRẢ LỜI JSON VỚI explanation GIẢI THÍCH LÝ DO CỤ THỂ (tại sao set những con số đó, dựa vào thông tin gì):"""

    response = query_ollama(prompt)
    
    if response:
        try:
            # Try to extract JSON from response
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                json_str = response[start:end]
                result = json.loads(json_str)
                
                # Validation: kiểm tra các giá trị có hợp lý không
                calories = int(result.get("calories", 0))
                protein = int(result.get("protein", 0))
                carbs = int(result.get("carbs", 0))
                fat = int(result.get("fat", 0))
                
                # Nếu carbs = 0 hoặc quá thấp -> tính lại bằng công thức
                if carbs < 50 or calories < 1000 or protein < 30:
                    logger.warning(f"Ollama trả về kết quả không hợp lý: cal={calories}, p={protein}, c={carbs}, f={fat}")
                    logger.info("Sử dụng công thức Mifflin-St Jeor để đảm bảo chính xác")
                    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
                    result["source"] = "formula_validated"
                    result["explanation"] = "Sử dụng công thức Mifflin-St Jeor (chuẩn y khoa)"
                    return result
                
                result["source"] = "ollama"
                result["calories"] = calories
                result["protein"] = protein
                result["carbs"] = carbs
                result["fat"] = fat
                # Tạo explanation CỤ THỂ với lý do và số liệu
                if not result.get("explanation"):
                    goal_explanations = {
                        "lose": f"Mục tiêu giảm cân: {calories}kcal/ngày (giảm 15% so với nhu cầu). Protein {protein}g để không mất cơ.",
                        "gain": f"Mục tiêu tăng cân: {calories}kcal/ngày (tăng 15% so với nhu cầu). Carbs {carbs}g hỗ trợ tập luyện.",
                        "maintain": f"Duy trì cân nặng: {calories}kcal/ngày. Macro cân bằng 25% Protein, 50% Carbs, 25% Fat."
                    }
                    result["explanation"] = goal_explanations.get(goal.lower(), f"Dựa trên thông tin cơ thể: {calories}kcal, P:{protein}g, C:{carbs}g, F:{fat}g.")
                return result
                
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Ollama response: {response[:100]}")
    
    # Fallback to formula - với explanation chi tiết
    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    result["source"] = "formula"
    # Giữ explanation từ formula (đã có chi tiết về TDEE, goal)
    return result


# ============== MAIN FUNCTION ==============

def get_nutrition_advice_gemini(
    gender: str,
    age: int,
    height_cm: float,
    weight_kg: float,
    activity_level: str,
    goal: str
) -> Dict[str, Any]:
    """
    Main function: Try Ollama first, then fallback
    (Named _gemini for backward compatibility)
    With caching for improved response time
    """
    
    # Tạo cache key từ input params
    cache_key = nutrition_cache._make_key(gender, age, height_cm, weight_kg, activity_level, goal)
    
    # Check cache first
    cached_result = nutrition_cache.get(cache_key)
    if cached_result:
        logger.info(f"Nutrition advice served from cache (stats: {nutrition_cache.stats()})")
        cached_result["source"] = cached_result.get("source", "unknown") + "_cached"
        return cached_result
    
    # Priority 1: Ollama local
    if OLLAMA_AVAILABLE:
        logger.info("Using Ollama local LLM")
        result = get_nutrition_advice_ollama(
            gender, age, height_cm, weight_kg, activity_level, goal
        )
        # Cache the result
        nutrition_cache.set(cache_key, result)
        return result
    
    # Priority 2: Gemini API (if configured)
    if GEMINI_API_KEY:
        logger.info("Ollama not available, trying Gemini")
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            # ... Gemini implementation (keeping for backup)
        except:
            pass
    
    # Priority 3: Formula fallback (DISABLED - STRICT MODE)
    # logger.info("Using Mifflin-St Jeor formula fallback")
    # result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    # result["source"] = "formula"
    # result["explanation"] = "Sử dụng công thức Mifflin-St Jeor"
    # return result
    
    raise Exception("Ollama (Nutrition LLM) is unavailable. Fallback is disabled in Strict Mode.")


def get_meal_insight_gemini(
    meal_items: list,
    total_calories: int,
    target_calories: int,
    current_macros: Dict[str, int],
    target_macros: Dict[str, int]
) -> Dict[str, Any]:
    """
    Get AI insight about a meal (Ollama or fallback)
    """
    if not OLLAMA_AVAILABLE:
        return {
            "insight": "AI chưa được cấu hình. Hãy cài đặt Ollama để nhận phân tích.",
            "suggestions": [],
            "score": 5,
            "source": "none"
        }
    
    items_str = ", ".join([f"{item.get('name', 'Unknown')}" for item in meal_items[:5]])
    
    prompt = f"""Phân tích bữa ăn ngắn gọn:
Món: {items_str}
Đã ăn: {total_calories}/{target_calories} kcal
Protein: {current_macros.get('protein', 0)}/{target_macros.get('protein', 0)}g

Trả lời JSON: {{"insight": "nhận xét 1 câu", "score": điểm_1_10, "suggestions": ["gợi ý 1"]}}"""

    response = query_ollama(prompt)
    
    if response:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["source"] = "ollama"
                return result
        except:
            pass
    
    # Simple fallback (DISABLED - STRICT MODE)
    # pct = (total_calories / target_calories * 100) if target_calories > 0 else 0
    # return {
    #     "insight": f"Bạn đã ăn {pct:.0f}% mục tiêu calories hôm nay.",
    #     "score": 7 if 80 <= pct <= 120 else 5,
    #     "suggestions": ["Tiếp tục theo dõi để đạt mục tiêu"],
    #     "source": "fallback"
    # }
    raise Exception("Ollama (Nutrition LLM) is unavailable. Fallback is disabled in Strict Mode.")


# ============== COOKING INSTRUCTIONS GENERATOR ==============

def get_cooking_instructions(
    recipe_name: str,
    ingredients: list[dict],
    description: str = ""
) -> Dict[str, Any]:
    """
    Gọi Ollama AI để generate hướng dẫn nấu ăn chi tiết
    
    Args:
        recipe_name: Tên món ăn
        ingredients: List các nguyên liệu [{foodName, grams}, ...]
        description: Mô tả món ăn (optional)
    
    Returns:
        Dict với steps: list các bước nấu
    """
    # Check Ollama availability first
    if not OLLAMA_AVAILABLE:
        logger.warning("Ollama not available for cooking instructions, using fallback")
        return _generate_fallback_instructions(recipe_name, ingredients)
    
    # Format ingredients list
    ingredients_str = ", ".join([
        f"{ing.get('foodName', 'Unknown')} ({ing.get('grams', 100)}g)"
        for ing in ingredients
    ])
    
    prompt = f"""Hướng dẫn nấu món "{recipe_name}" với: {ingredients_str}.
{f"Mô tả: {description}" if description else ""}

Viết 4-6 bước nấu ngắn gọn bằng tiếng Việt.

Trả lời JSON: {{"steps": ["bước 1", "bước 2", ...], "cookingTime": "XX phút", "difficulty": "Dễ/Trung bình/Khó"}}"""

    response = query_ollama(prompt)
    
    if response:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["source"] = "ollama"
                logger.info(f"Generated cooking instructions for {recipe_name}")
                return result
        except Exception as e:
            logger.error(f"Error parsing cooking instructions: {e}")
    
    # Fallback khi Ollama không trả về kết quả hợp lệ
    logger.warning(f"Ollama failed for cooking instructions, using fallback for {recipe_name}")
    return _generate_fallback_instructions(recipe_name, ingredients)


def _generate_fallback_instructions(recipe_name: str, ingredients: list[dict]) -> Dict[str, Any]:
    """
    Tạo hướng dẫn nấu ăn mặc định khi Ollama không khả dụng
    """
    # Lấy tên các nguyên liệu
    ing_names = [ing.get('foodName', 'nguyên liệu') for ing in ingredients[:5]]
    
    steps = [
        f"Sơ chế và rửa sạch các nguyên liệu: {', '.join(ing_names)}",
        "Cắt hoặc thái nguyên liệu theo kích thước phù hợp",
        f"Cho dầu ăn vào chảo, đun nóng ở lửa vừa",
        f"Cho các nguyên liệu vào chảo theo thứ tự, đảo đều",
        "Nêm gia vị theo khẩu vị (muối, tiêu, nước mắm)",
        f"Trang trí và thưởng thức món {recipe_name}"
    ]
    
    return {
        "steps": steps,
        "cookingTime": "20-30 phút",
        "difficulty": "Trung bình",
        "source": "fallback",
        "note": "Hướng dẫn cơ bản - AI đang bận, vui lòng thử lại sau để có hướng dẫn chi tiết hơn"
    }

