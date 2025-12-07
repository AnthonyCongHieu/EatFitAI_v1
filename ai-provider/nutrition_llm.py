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
    
    # Macro distribution
    protein = int(weight_kg * 1.8)  # 1.8g per kg for active
    fat = int(calories * 0.25 / 9)  # 25% from fat
    carbs = int((calories - protein * 4 - fat * 9) / 4)
    
    return {
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat
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
    """
    prompt = f"""Bạn là chuyên gia dinh dưỡng. Tính toán mục tiêu dinh dưỡng cho:
- Giới tính: {gender}
- Tuổi: {age}
- Chiều cao: {height_cm}cm
- Cân nặng: {weight_kg}kg
- Mức vận động: {activity_level}
- Mục tiêu: {goal}

Trả lời CHÍNH XÁC theo format JSON (không giải thích thêm):
{{"calories": số, "protein": số, "carbs": số, "fat": số, "explanation": "giải thích ngắn"}}"""

    response = query_ollama(prompt)
    
    if response:
        try:
            # Try to extract JSON from response
            # Find JSON in response (might have extra text)
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                json_str = response[start:end]
                result = json.loads(json_str)
                result["source"] = "ollama"
                return result
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Ollama response: {response[:100]}")
    
    # Fallback to formula
    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    result["source"] = "formula"
    result["explanation"] = "Sử dụng công thức Mifflin-St Jeor"
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
    """
    
    # Priority 1: Ollama local
    if OLLAMA_AVAILABLE:
        logger.info("Using Ollama local LLM")
        return get_nutrition_advice_ollama(
            gender, age, height_cm, weight_kg, activity_level, goal
        )
    
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
