"""
Nutrition LLM Service - Powered by Ollama (Local)
Provides AI-powered nutrition advice, meal insights, and voice command parsing
"""

from __future__ import annotations
import os
import json
import logging
import requests
import hashlib
import time
from typing import Any, Dict, Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# Configuration - Ollama LLM
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

# ============== SIMPLE CACHE SYSTEM ==============
# In-memory cache với TTL để giảm latency cho repeated queries

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
                # Expired - xóa khỏi cache
                del self._cache[key]
        return None
    
    def set(self, prompt: str, value: str, ttl: int = None):
        """Lưu giá trị vào cache"""
        key = self._make_key(prompt)
        expire_time = time.time() + (ttl or self._default_ttl)
        self._cache[key] = (value, expire_time)
        logger.debug(f"Cached response for key {key[:8]}... (TTL: {ttl or self._default_ttl}s)")
    
    def clear(self):
        """Xóa toàn bộ cache"""
        self._cache.clear()
        logger.info("Cache cleared")

# Global cache instances
_nutrition_cache = SimpleCache(default_ttl=600)   # 10 phút cho nutrition advice
_meal_insight_cache = SimpleCache(default_ttl=120)  # 2 phút cho meal insight (data thay đổi nhanh hơn)

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

# General cache cho tất cả Ollama queries
_general_cache = SimpleCache(default_ttl=300)  # 5 phút mặc định

def query_ollama(prompt: str, model: str = None, stream: bool = False, use_cache: bool = True, cache_ttl: int = None) -> Optional[str]:
    """
    Query Ollama local LLM with optional caching
    Args:
        prompt: The prompt to send
        model: Model name (default: OLLAMA_MODEL)
        stream: If True, returns generator for streaming
        use_cache: If True, check/store cache (default: True)
        cache_ttl: Custom TTL for cache in seconds
    Returns None if failed
    """
    if not OLLAMA_AVAILABLE:
        return None
    
    # Check cache first (only for non-streaming)
    if use_cache and not stream:
        cached = _general_cache.get(prompt)
        if cached:
            logger.info("Ollama cache hit - returning cached response")
            return cached
    
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model or OLLAMA_MODEL,
                "prompt": prompt,
                "stream": stream,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 200
                }
            },
            timeout=60,  # Increased for slower CPU inference
            stream=stream
        )
        
        if response.status_code == 200:
            if stream:
                # Return streaming content
                full_response = ""
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            full_response += chunk.get("response", "")
                            if chunk.get("done", False):
                                break
                        except:
                            pass
                return full_response
            else:
                result = response.json()
                response_text = result.get("response", "")
                
                # Store in cache
                if use_cache and response_text:
                    _general_cache.set(prompt, response_text, cache_ttl)
                
                return response_text
        else:
            logger.error(f"Ollama error: {response.status_code}")
            return None
            
    except requests.exceptions.Timeout:
        logger.error("Ollama timeout")
        return None
    except Exception as e:
        logger.error(f"Ollama query failed: {e}")
        return None


def query_ollama_streaming(prompt: str, model: str = None):
    """
    Query Ollama with streaming - returns generator for real-time response
    Use this for long responses like cooking instructions
    """
    if not OLLAMA_AVAILABLE:
        return None
    
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model or OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 500  # Longer for cooking instructions
                }
            },
            timeout=60,
            stream=True
        )
        
        if response.status_code == 200:
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        text = chunk.get("response", "")
                        if text:
                            yield text
                        if chunk.get("done", False):
                            break
                    except:
                        pass
        else:
            logger.error(f"Ollama streaming error: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Ollama streaming failed: {e}")


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

def get_nutrition_advice(
    gender: str,
    age: int,
    height_cm: float,
    weight_kg: float,
    activity_level: str,
    goal: str
) -> Dict[str, Any]:
    """
    Main function: Try Ollama first, then fallback to formula
    """
    
    # Priority 1: Ollama local
    if OLLAMA_AVAILABLE:
        logger.info("Using Ollama local LLM")
        return get_nutrition_advice_ollama(
            gender, age, height_cm, weight_kg, activity_level, goal
        )
    
    # Priority 2: Formula fallback (Mifflin-St Jeor - chuẩn y khoa)
    logger.info("Ollama not available, using Mifflin-St Jeor formula fallback")
    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    result["source"] = "formula"
    result["explanation"] = "Sử dụng công thức Mifflin-St Jeor (chuẩn y khoa) - AI tạm thời không khả dụng"
    return result


def get_meal_insight(
    meal_items: list,
    total_calories: int,
    target_calories: int,
    current_macros: Dict[str, int],
    target_macros: Dict[str, int],
    user_history: Optional[Dict[str, Any]] = None  # Thêm user history cho personalization
) -> Dict[str, Any]:
    """
    Get AI insight about a meal (Ollama or fallback)
    Improved với few-shot examples, context analysis, và personalization
    
    Args:
        user_history: Optional dict chứa:
            - favorite_foods: list các món hay ăn
            - avg_calories_7d: calories trung bình 7 ngày
            - consistency_score: điểm consistency (0-100)
            - common_deficit: thiếu gì thường xuyên (protein/carbs/fat)
    """
    if not OLLAMA_AVAILABLE:
        return {
            "insight": "AI chưa được cấu hình. Hãy cài đặt Ollama để nhận phân tích.",
            "suggestions": [],
            "score": 5,
            "source": "none"
        }
    
    items_str = ", ".join([f"{item.get('name', 'Unknown')}" for item in meal_items[:5]])
    
    # Tính toán context
    cal_pct = (total_calories / target_calories * 100) if target_calories > 0 else 0
    protein_current = current_macros.get('protein', 0)
    protein_target = target_macros.get('protein', 0)
    protein_pct = (protein_current / protein_target * 100) if protein_target > 0 else 0
    
    cal_status = "đủ" if 85 <= cal_pct <= 115 else ("thiếu" if cal_pct < 85 else "thừa")
    protein_status = "đủ" if 85 <= protein_pct <= 115 else ("thiếu" if protein_pct < 85 else "thừa")
    
    # Build personalization context từ user history
    personalization_context = ""
    if user_history:
        if user_history.get('favorite_foods'):
            fav_foods = ", ".join(user_history['favorite_foods'][:3])
            personalization_context += f"\n- Món hay ăn: {fav_foods}"
        if user_history.get('avg_calories_7d'):
            personalization_context += f"\n- Calories trung bình 7 ngày: {user_history['avg_calories_7d']:.0f}kcal"
        if user_history.get('common_deficit'):
            personalization_context += f"\n- Thường thiếu: {user_history['common_deficit']}"
        if user_history.get('consistency_score'):
            personalization_context += f"\n- Điểm consistency: {user_history['consistency_score']:.0f}%"
    
    prompt = f"""Phân tích dinh dưỡng ngày hôm nay. Trả lời ngắn gọn và thực tế.

THÔNG TIN HÔM NAY:
- Món đã ăn: {items_str}
- Calories: {total_calories}/{target_calories} kcal ({cal_pct:.0f}%) → {cal_status}
- Protein: {protein_current}/{protein_target}g ({protein_pct:.0f}%) → {protein_status}
- Carbs: {current_macros.get('carbs', 0)}g, Fat: {current_macros.get('fat', 0)}g
{personalization_context}

QUY TẮC:
- Nếu calories < 85%: gợi ý ăn thêm (ưu tiên món user hay ăn nếu có)
- Nếu calories > 115%: gợi ý giảm bữa còn lại
- Nếu protein thấp: gợi ý thêm thịt/trứng/cá
- Nếu có món hay ăn: gợi ý món đó để tăng adherence
- Score 8-10: rất tốt, 6-7: ổn, 3-5: cần cải thiện

VÍ DỤ 1 (đạt mục tiêu):
Input: Calories 1800/2000 (90%), Protein 100/120g (83%)
→ {{"insight": "Bạn đang theo dõi tốt! Còn 200kcal và 20g protein cho bữa còn lại.", "score": 8, "suggestions": ["Thêm 100g ức gà hoặc 2 quả trứng"]}}

VÍ DỤ 2 (thiếu nhiều, có món hay ăn):
Input: Calories 600/2000 (30%), Protein 30/120g (25%), Món hay ăn: phở bò, cơm gà
→ {{"insight": "Bạn mới ăn 30% mục tiêu. Thử ăn phở bò hoặc cơm gà bạn hay thích!", "score": 5, "suggestions": ["Ăn phở bò (500kcal)", "Hoặc cơm gà (600kcal)"]}}

VÍ DỤ 3 (thừa):
Input: Calories 2500/2000 (125%), Protein 150/120g (125%)
→ {{"insight": "Bạn đã vượt mục tiêu 500kcal. Hạn chế ăn thêm hôm nay.", "score": 6, "suggestions": ["Bỏ qua bữa phụ hôm nay", "Uống nhiều nước"]}}

TRẢ LỜI JSON (chỉ JSON, không giải thích):"""

    response = query_ollama(prompt, use_cache=True, cache_ttl=120)  # Cache 2 phút
    
    if response:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["source"] = "ollama"
                # Validate score
                if "score" not in result or not isinstance(result.get("score"), (int, float)):
                    result["score"] = 7
                return result
        except:
            pass
    
    # Smart fallback với logic cụ thể
    if cal_pct >= 115:
        insight = f"Bạn đã vượt {cal_pct - 100:.0f}% mục tiêu. Hạn chế ăn thêm."
        suggestions = ["Uống nước thay đồ uống có đường", "Tập nhẹ 20-30 phút"]
        score = 6
    elif cal_pct < 50:
        insight = f"Mới ăn {cal_pct:.0f}% mục tiêu. Đừng quên ăn đủ bữa!"
        suggestions = ["Ăn thêm bữa chính đầy đủ", "Bổ sung rau xanh và protein"]
        score = 5
    elif cal_pct < 85:
        remaining = target_calories - total_calories
        suggestions = [f"Cần thêm khoảng {remaining}kcal"]
        if protein_pct < 80:
            suggestions.append("Ưu tiên thêm protein (thịt, trứng, cá)")
        insight = f"Còn {remaining}kcal để đạt mục tiêu."
        score = 6
    else:
        insight = f"Tuyệt vời! Bạn đang theo dõi tốt ({cal_pct:.0f}% mục tiêu)."
        suggestions = ["Giữ vững nhịp này!"]
        score = 8
        
    return {
        "insight": insight,
        "score": score,
        "suggestions": suggestions,
        "source": "fallback"
    }


# ============== COOKING INSTRUCTIONS GENERATOR ==============

def get_cooking_instructions(
    recipe_name: str,
    ingredients: list[dict],
    description: str = ""
) -> Dict[str, Any]:
    """
    Gọi Ollama AI để generate hướng dẫn nấu ăn chi tiết
    Improved với few-shot examples và cooking tips
    
    Args:
        recipe_name: Tên món ăn
        ingredients: List các nguyên liệu [{foodName, grams}, ...]
        description: Mô tả món ăn (optional)
    
    Returns:
        Dict với steps: list các bước nấu, cookingTime, difficulty, tips
    """
    # Check Ollama availability first
    if not OLLAMA_AVAILABLE:
        logger.warning("Ollama not available for cooking instructions, using fallback")
        return _generate_fallback_instructions(recipe_name, ingredients)
    
    # Format ingredients list với thông tin chi tiết
    ingredients_str = ", ".join([
        f"{ing.get('foodName', 'Unknown')} ({ing.get('grams', 100)}g)"
        for ing in ingredients
    ])
    
    # Calculate approximate macros for context
    total_protein = sum(ing.get('protein', 0) for ing in ingredients)
    total_cals = sum(ing.get('calories', 0) for ing in ingredients)
    
    prompt = f"""Bạn là đầu bếp chuyên nghiệp người Việt với 15 năm kinh nghiệm. Hướng dẫn nấu món ăn CỰC KỲ CHI TIẾT.

MÓN ĂN: "{recipe_name}"
NGUYÊN LIỆU: {ingredients_str}
{f"MÔ TẢ: {description}" if description else ""}

━━━ YÊU CẦU BẮT BUỘC ━━━

1. **CHI TIẾT TUYỆT ĐỐI**: Mỗi bước phải có:
   • Thời gian cụ thể (phút/giây)
   • Nhiệt độ/mức lửa (lớn/vừa/nhỏ, số độ C nếu nướng)
   • Kỹ thuật nấu rõ ràng (xào/luộc/hấp/chiên)
   • Dấu hiệu nhận biết (vàng/chín/mềm/giòn)
   • Lượng gia vị CỤ THỂ (muỗng cà phê/canh, gram)

2. **CẤU TRÚC**: 7-10 bước, mỗi bước 2-3 câu
   • Bước 1-2: Sơ chế nguyên liệu (rửa, thái, ướp)
   • Bước 3-7: Nấu chính (chi tiết từng công đoạn)
   • Bước 8-10: Hoàn thiện và trang trí

3. **TIPS THỰC CHIẾN**: 3-4 tips hữu ích:
   • Mẹo để món ngon hơn
   • Cách tránh lỗi thường gặp
   • Biến tấu cho người bận rộn
   • Bảo quản và hâm nóng

4. **THÔNG TIN BỔ SUNG**:
   • Thời gian nấu THỰC TẾ (tính cả sơ chế)
   • Độ khó (Rất dễ/Dễ/Trung bình/Khó)
   • Lưu ý quan trọng (nếu có)

━━━ VÍ DỤ CHUẨN (PHẢI CHI TIẾT NHƯ VẬY) ━━━

Input: Cơm gà xào rau củ - Gà(150g), Cơm(200g), Bông cải xanh(100g)

Output:
{{
  "steps": [
    "Rửa sạch 150g ức gà, thấm khô bằng giấy ăn. Thái miếng vuông 2x2cm (khoảng 10-12 miếng). Ướp với 1/2 muỗng cà phê muối, 1/2 muỗng cà phê hạt nêm, 1 muỗng cà phê dầu ăn. Trộn đều, để yên 10-15 phút cho thấm gia vị.",
    
    "Rửa 100g bông cải xanh, cắt thành từng bông nhỏ (khoảng 3-4cm). Đun sôi 500ml nước + 1/4 muỗng cà phê muối. Chần bông cải đúng 2 phút (đếm từ khi nước sôi lại), vớt ra ngâm ngay vào bát nước đá 1 phút để giữ màu xanh giòn.",
    
    "Bắc chảo chống dính lên bếp, cho 2 muỗng canh dầu ăn. Đun ở lửa vừa đến khi dầu nóng (thử bằng đũa thấy sủi bọt nhỏ xung quanh). Tăng lửa lớn.",
    
    "Cho gà đã ướp vào chảo, xếp thành 1 lớp đều. KHÔNG đảo ngay! Để yên 1.5 phút cho gà chín vàng mặt dưới. Sau đó đảo đều, xào thêm 2-3 phút đến khi gà chín vàng đều, không còn hồng bên trong. Vớt gà ra đĩa riêng.",
    
    "Giữ nguyên chảo (không rửa), cho thêm 1 muỗng cà phê dầu nếu khô. Cho bông cải đã chần vào, xào nhanh trên lửa lớn 1.5 phút. Thêm 2 muỗng canh nước lọc để tạo hơi nước.",
    
    "Cho gà đã xào trở lại chảo cùng bông cải. Nêm 1 muỗng canh nước mắm, 1/2 muỗng cà phê đường, 1/4 muỗng cà phê tiêu. Đảo đều trong 1 phút cho gia vị thấm. Nếm thử và điều chỉnh.",
    
    "Tắt bếp. Xúc 200g cơm nóng ra đĩa, xếp gà xào rau lên trên. Rắc thêm 1 nhúm tiêu đen xay và rau mùi tươi (tùy chọn). Ăn nóng ngay để giữ độ giòn của rau."
  ],
  
  "cookingTime": "25-30 phút (sơ chế 10 phút, nấu 15-20 phút)",
  
  "difficulty": "Dễ",
  
  "tips": [
    "Bí quyết gà mềm: Ướp ít dầu ăn giúp khóa nước, không bị khô. Xào lửa lớn và NHANH (tối đa 5 phút) để gà không dai.",
    
    "Rau giòn xanh: Chần qua nước sôi rồi ngâm nước đá là bước QUAN TRỌNG. Bỏ qua sẽ làm rau nhũn và xỉn màu.",
    
    "Biến tấu nhanh: Không có thời gian? Dùng gà xé sẵn từ siêu thị, rau đông lạnh. Thời gian giảm còn 10 phút.",
    
    "Bảo quản: Để riêng cơm và gà xào. Bảo quản tủ lạnh 2 ngày. Hâm nóng: Vi sóng 2 phút hoặc chảo 3 phút."
  ],
  
  "notes": "Món này cung cấp khoảng 450kcal, 35g protein - phù hợp cho bữa trưa/tối. Có thể thay gà bằng tôm (giảm thời gian xào xuống 2 phút) hoặc đậu hũ (cho người ăn chay)."
}}

━━━ BẮT ĐẦU TẠO HƯỚNG DẪN ━━━

TRẢ LỜI JSON hợp lệ, KHÔNG giải thích thêm. Phải CHI TIẾT như ví dụ trên:"""

    response = query_ollama(prompt, use_cache=True, cache_ttl=600)  # Cache 10 phút cho recipe
    
    if response:
        try:
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["source"] = "ollama"
                # Validate steps
                if "steps" in result and len(result["steps"]) >= 3:
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


# ============== VOICE COMMAND PARSING ==============

import re

# Mapping số chữ sang số
VIETNAMESE_NUMBERS = {
    "không": 0, "một": 1, "hai": 2, "ba": 3, "bốn": 4, "năm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9,
    "mười": 10, "mười một": 11, "mười hai": 12, "mười ba": 13, "mười bốn": 14, "mười lăm": 15,
    "hai mươi": 20, "ba mươi": 30, "bốn mươi": 40, "năm mươi": 50, "sáu mươi": 60, "bảy mươi": 70, "tám mươi": 80, "chín mươi": 90,
    "một trăm": 100, "hai trăm": 200, "ba trăm": 300,
}

def parse_vietnamese_number(text: str) -> int:
    """
    Parse số tiếng Việt sang int. VD: 'hai nghìn sáu trăm' -> 2600
    Hỗ trợ: đơn vị (0-9), chục (10-90), trăm (100-900), nghìn (1000-9000)
    """
    text = text.lower().strip()
    
    # Nếu đã là số
    if text.isdigit():
        return int(text)
    
    result = 0
    
    # Bước 0: Tìm NGHÌN/NGÀN (1000-9000)
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
    
    # Bước 1: Tìm TRĂM (100-900)
    hundreds_map = {
        "một trăm": 100, "hai trăm": 200, "ba trăm": 300, "bốn trăm": 400,
        "năm trăm": 500, "sáu trăm": 600, "bảy trăm": 700, "tám trăm": 800, "chín trăm": 900
    }
    for word, val in hundreds_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # Bước 2: Tìm CHỤC (10-90)
    tens_map = {
        "mười": 10, "hai mươi": 20, "ba mươi": 30, "bốn mươi": 40,
        "năm mươi": 50, "sáu mươi": 60, "bảy mươi": 70, "tám mươi": 80, "chín mươi": 90
    }
    for word, val in tens_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # Bước 3: Tìm ĐƠN VỊ (1-9)
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
    """
    Tiền xử lý: Chuyển số tiếng Việt thành số digit.
    VD: "thêm sáu trăm gam gà" -> "thêm 600gam gà"
    VD: "hai nghìn calo" -> "2000 calo"
    """
    import re
    
    # Pattern để tìm số tiếng Việt + đơn vị (gam/g/gram/ký/kg/calo)
    # Hỗ trợ: nghìn/ngàn, trăm, chục, đơn vị
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
    logger.info(f"Preprocessed: '{text}' -> '{result}'")
    return result


def try_parse_weight_regex(text: str) -> Dict[str, Any] | None:
    """Regex để parse LOG_WEIGHT. Trả về None nếu không match."""
    lower = text.lower().strip()
    
    # Pattern: số + ký/kg/kilogram (không có "calo/calories")
    # VD: "hôm nay tôi 70 ký", "cân nặng 65 kg", "tôi bảy mươi lăm ký"
    
    # Không match nếu có "calo"
    if "calo" in lower or "calories" in lower or "kcal" in lower:
        return None
    
    # Pattern với số
    pattern_number = r"(?:cân nặng|tôi|nặng)\s*(?:là\s+)?(\d+(?:\.\d+)?)\s*(?:ký|kg|kilogram)?"
    match = re.search(pattern_number, lower, re.IGNORECASE)
    if match:
        weight = float(match.group(1))
        if 30 <= weight <= 200:  # Valid weight range
            return {
                "intent": "LOG_WEIGHT",
                "entities": {"weight": weight},
                "confidence": 0.95,
                "rawText": text,
                "source": "regex"
            }
    
    # Pattern với số chữ: "tôi bảy mươi lăm ký", "một trăm ký"
    # Thêm "trăm", "linh", "lẻ" vào pattern
    pattern_text = r"(?:cân nặng|tôi|nặng)\s*((?:một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mươi|lăm|mốt|trăm|linh|lẻ|\s)+)\s*(?:ký|kg|kilogram)"
    match = re.search(pattern_text, lower, re.IGNORECASE)
    if match:
        weight = parse_vietnamese_number(match.group(1))
        # Nếu parse ra 0 (failed) nhưng text có "một trăm" -> thủ công fix
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
    """Regex để parse ASK_CALORIES. Trả về None nếu không match."""
    lower = text.lower().strip()
    
    # Pattern: "bao nhiêu calo", "ăn bao nhiêu calo", "tiêu thụ mấy calo"
    # QUAN TRỌNG: Phải có từ "calo/calories/kcal/năng lượng"
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


def parse_voice_command_ollama(text: str) -> Dict[str, Any]:
    """
    Parse Vietnamese voice command using regex first, then Ollama LLM as fallback.
    
    Input examples:
    - "thêm 1 bát phở 300g bữa trưa"
    - "ghi cân nặng 65 kg"
    - "hôm nay ăn bao nhiêu calo"
    
    Returns:
        Dict with intent, entities, confidence, rawText
    """
    
    # ========== BƯỚC 1: REGEX PRE-PROCESSING ==========
    # Thử match các pattern rõ ràng trước khi gọi Ollama
    
    # 1.1 Thử parse LOG_WEIGHT
    weight_result = try_parse_weight_regex(text)
    if weight_result:
        logger.info(f"Voice parsed by REGEX: LOG_WEIGHT, weight={weight_result['entities'].get('weight')}")
        return weight_result
    
    # 1.2 Thử parse ASK_CALORIES
    calories_result = try_parse_ask_calories_regex(text)
    if calories_result:
        logger.info(f"Voice parsed by REGEX: ASK_CALORIES")
        return calories_result
    
    # ========== BƯỚC 2: OLLAMA LLM (cho ADD_FOOD và complex cases) ==========
    if not OLLAMA_AVAILABLE:
        logger.warning("Ollama not available for voice parsing")
        return {
            "intent": "UNKNOWN",
            "entities": {},
            "confidence": 0.0,
            "rawText": text,
            "source": "fallback",
            "error": "Ollama không khả dụng"
        }
    
    # TIỀN XỬ LÝ: Chuyển số tiếng Việt thành số digit
    # VD: "sáu trăm gam gà" -> "600gam gà"
    processed_text = preprocess_vietnamese_numbers(text)
    logger.info(f"Preprocessed text: '{text}' -> '{processed_text}'")
    
    # Prompt cải tiến: Nhận input đa dạng, support nhiều món, fix pattern recognition
    prompt = f"""Bạn là AI phân tích lệnh giọng nói tiếng Việt cho app theo dõi calories.

LỆNH CẦN PHÂN TÍCH: "{processed_text}"

━━━ BƯỚC 1: XÁC ĐỊNH INTENT ━━━

⚠️ QUAN TRỌNG - THỨ TỰ ƯU TIÊN:

1. LOG_WEIGHT: Nếu có SỐ + đơn vị cân nặng (ký/kg/kilogram)
   Patterns: "tôi X ký", "hôm nay X kg", "cân nặng X", "nặng X"
   VD: "hôm nay tôi 70 ký" → LOG_WEIGHT (KHÔNG PHẢI ASK_CALORIES!)

2. ASK_CALORIES: CHỈ KHI hỏi "bao nhiêu calo" và KHÔNG có tên món cụ thể
   Patterns: "ăn bao nhiêu calo?", "đã ăn bao nhiêu kcal?"
   
3. ADD_FOOD: Nếu có TÊN MÓN ĂN cụ thể (dù có "ăn" hay không)
   Patterns: "thêm/ghi/ăn [món]", "tôi ăn [món]", "hôm nay ăn [món]"
   VD: "tôi ăn 100g cơm" → ADD_FOOD (KHÔNG PHẢI ASK_CALORIES!)
   VD: "thêm 100g cơm và 200g gà" → ADD_FOOD với 2 món

4. UNKNOWN: Không khớp pattern nào

━━━ BƯỚC 2: TRÍCH XUẤT ENTITIES ━━━

LOG_WEIGHT:
• weight: số kg (chuyển chữ → số!)
• Mapping: "bảy mươi"=70, "sáu mươi lăm"=65, "năm lăm"=55, "bốn lăm"=45

ADD_FOOD (1 món):
• foodName: tên món (chỉ tên, không số/đơn vị)  
• quantity: số lượng (1,2,3...) - cho bát/đĩa/quả
• weight: số gram nếu có "g/gam/gram"
• unit: đơn vị đếm (bát/đĩa/quả/cái/ly)
• mealType: breakfast/lunch/dinner/snack

ADD_FOOD (NHIỀU MÓN - dùng khi có "và/với/cùng"):
• foods: ARRAY các món, mỗi món có {{foodName, weight/quantity, unit}}
• mealType: bữa ăn chung

ASK_CALORIES: entities rỗng {{}}

━━━ VÍ DỤ THAM KHẢO ━━━

--- LOG_WEIGHT ---
Input: "hôm nay tôi 70 ký"
→ {{"intent":"LOG_WEIGHT","entities":{{"weight":70}},"confidence":0.95}}

Input: "tôi bảy mươi kg"
→ {{"intent":"LOG_WEIGHT","entities":{{"weight":70}},"confidence":0.9}}

Input: "cân nặng sáu mươi lăm"
→ {{"intent":"LOG_WEIGHT","entities":{{"weight":65}},"confidence":0.9}}

Input: "hôm nay tôi một trăm hai mươi ký"
→ {{"intent":"LOG_WEIGHT","entities":{{"weight":120}},"confidence":0.9}}

⚠️ CHUYỂN ĐỔI SỐ TIẾNG VIỆT:
- "một trăm" = 100, "một trăm hai mươi" = 120, "một trăm linh năm" = 105
- "bảy mươi lăm" = 75, "sáu mươi lăm" = 65, "tám mươi mốt" = 81

--- ADD_FOOD (1 món) ---
Input: "tôi ăn 150g thịt heo bữa trưa"
→ {{"intent":"ADD_FOOD","entities":{{"foodName":"thịt heo","weight":150,"mealType":"lunch"}},"confidence":0.95}}

Input: "thêm 2 quả trứng sáng nay"
→ {{"intent":"ADD_FOOD","entities":{{"foodName":"trứng","quantity":2,"unit":"quả","mealType":"breakfast"}},"confidence":0.95}}

--- ADD_FOOD (NHIỀU MÓN) ---
Input: "thêm 200g cá và 150g rau bữa tối"
→ {{"intent":"ADD_FOOD","entities":{{"foods":[{{"foodName":"cá","weight":200}},{{"foodName":"rau","weight":150}}],"mealType":"dinner"}},"confidence":0.9}}

Input: "ăn 1 bát phở và 1 ly trà đá"
→ {{"intent":"ADD_FOOD","entities":{{"foods":[{{"foodName":"phở","quantity":1,"unit":"bát"}},{{"foodName":"trà đá","quantity":1,"unit":"ly"}}]}},"confidence":0.9}}

Input: "thêm 50g đậu và 100g khoai và 75g ngô"
→ {{"intent":"ADD_FOOD","entities":{{"foods":[{{"foodName":"đậu","weight":50}},{{"foodName":"khoai","weight":100}},{{"foodName":"ngô","weight":75}}]}},"confidence":0.85}}

🚫 QUY TẮC TUYỆT ĐỐI - KHÔNG ĐƯỢC VI PHẠM:
1. CHỈ PARSE NHỮNG MÓN CÓ TRONG INPUT! Nếu input nói "gà" thì CHỈ có "gà", KHÔNG thêm "cơm" hay món khác!
2. COPY CHÍNH XÁC tên món từ input: "gà" → "gà", "bò" → "bò", "cơm" → "cơm"
3. COPY CHÍNH XÁC số gram từ input: "100g" → 100, KHÔNG tự đổi thành 200
4. ĐẾM ĐỦ số món: nếu input có 1 món thì output 1, có 2 món thì output 2, có 3 món thì output 3

🚫 VÍ DỤ SAI (KHÔNG LÀM THẾ NÀY):
❌ Input: "thêm 100g gà" → Output có thêm "cơm" (SAI! Input không có cơm)
❌ Input: "100g bò" → Output: weight:200 (SAI! Phải là 100)

--- ASK_CALORIES ---
Input: "hôm nay ăn bao nhiêu calo"  
→ {{"intent":"ASK_CALORIES","entities":{{}},"confidence":0.9}}

Input: "tôi đã tiêu thụ bao nhiêu calories"
→ {{"intent":"ASK_CALORIES","entities":{{}},"confidence":0.9}}

━━━ TRẢ LỜI ━━━
CHỈ trả về JSON hợp lệ, KHÔNG giải thích:"""

    try:
        response = query_ollama(prompt, use_cache=False)  # Không cache voice commands
        
        if response:
            # Parse JSON from response
            start = response.find("{")
            end = response.rfind("}") + 1
            
            if start != -1 and end > start:
                result = json.loads(response[start:end])
                result["rawText"] = text
                result["source"] = "ollama"
                
                # Validate and set defaults
                if "intent" not in result:
                    result["intent"] = "UNKNOWN"
                if "entities" not in result:
                    result["entities"] = {}
                if "confidence" not in result:
                    result["confidence"] = 0.5
                
                # POST-PROCESSING: Validate ADD_FOOD entities
                # Loại bỏ các món ăn không có trong input (chống hallucination)
                if result["intent"] == "ADD_FOOD":
                    text_lower = text.lower()
                    
                    # Nếu có nhiều món (foods array)
                    if "foods" in result.get("entities", {}):
                        valid_foods = []
                        for food in result["entities"]["foods"]:
                            food_name = food.get("foodName", "").lower()
                            # Chỉ giữ lại món có trong input
                            if food_name and food_name in text_lower:
                                valid_foods.append(food)
                            else:
                                logger.warning(f"Filtered hallucinated food: {food_name} (not in input)")
                        
                        if valid_foods:
                            result["entities"]["foods"] = valid_foods
                        else:
                            # Không còn food nào valid -> UNKNOWN
                            result["intent"] = "UNKNOWN"
                            result["confidence"] = 0.3
                            logger.warning("All foods filtered - returning UNKNOWN")
                    
                    # Nếu chỉ 1 món (foodName)
                    elif "foodName" in result.get("entities", {}):
                        food_name = result["entities"]["foodName"].lower()
                        if food_name not in text_lower:
                            logger.warning(f"Filtered hallucinated food: {food_name}")
                            result["intent"] = "UNKNOWN"
                            result["confidence"] = 0.3
                    
                logger.info(f"Voice parsed: intent={result['intent']}, entities={result.get('entities', {})}")
                return result
                
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in voice parsing: {e}")
    except Exception as e:
        logger.error(f"Voice parsing error: {e}")
    
    # Fallback response
    return {
        "intent": "UNKNOWN",
        "entities": {},
        "confidence": 0.0,
        "rawText": text,
        "source": "fallback",
        "error": "Không thể phân tích lệnh"
    }
