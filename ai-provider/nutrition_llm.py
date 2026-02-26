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

logger = logging.getLogger(__name__)

# Configuration - Ollama LLM
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
OLLAMA_HEALTHCHECK_TTL_SECONDS = int(os.getenv("OLLAMA_HEALTHCHECK_TTL_SECONDS", "10"))

# ============== SIMPLE CACHE SYSTEM ==============
# In-memory cache vá»›i TTL Ä‘á»ƒ giáº£m latency cho repeated queries

class SimpleCache:
    """Simple in-memory cache vá»›i TTL (Time To Live)"""
    def __init__(self, default_ttl: int = 300):  # 5 phÃºt máº·c Ä‘á»‹nh
        self._cache: Dict[str, tuple] = {}  # {key: (value, expire_time)}
        self._default_ttl = default_ttl
    
    def _make_key(self, prompt: str) -> str:
        """Táº¡o cache key tá»« prompt"""
        return hashlib.md5(prompt.encode()).hexdigest()
    
    def get(self, prompt: str) -> Optional[str]:
        """Láº¥y giÃ¡ trá»‹ tá»« cache náº¿u cÃ²n há»£p lá»‡"""
        key = self._make_key(prompt)
        if key in self._cache:
            value, expire_time = self._cache[key]
            if time.time() < expire_time:
                logger.debug(f"Cache hit for key {key[:8]}...")
                return value
            else:
                # Expired - xÃ³a khá»i cache
                del self._cache[key]
        return None
    
    def set(self, prompt: str, value: str, ttl: int = None):
        """LÆ°u giÃ¡ trá»‹ vÃ o cache"""
        key = self._make_key(prompt)
        expire_time = time.time() + (ttl or self._default_ttl)
        self._cache[key] = (value, expire_time)
        logger.debug(f"Cached response for key {key[:8]}... (TTL: {ttl or self._default_ttl}s)")
    
    def clear(self):
        """XÃ³a toÃ n bá»™ cache"""
        self._cache.clear()
        logger.info("Cache cleared")

# Global cache instances
_nutrition_cache = SimpleCache(default_ttl=600)   # 10 phÃºt cho nutrition advice
_meal_insight_cache = SimpleCache(default_ttl=120)  # 2 phÃºt cho meal insight (data thay Ä‘á»•i nhanh hÆ¡n)

# Check which LLM is available
def check_ollama_available() -> bool:
    """Check if Ollama is running and accessible"""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        return response.status_code == 200
    except:
        return False

_last_ollama_healthcheck_at = 0.0
_last_ollama_healthcheck_result = False

def is_ollama_available(force_refresh: bool = False) -> bool:
    """
    Runtime availability check with short TTL cache.
    Prevents stale startup-only status and reduces health-check spam.
    """
    global _last_ollama_healthcheck_at, _last_ollama_healthcheck_result

    now = time.time()
    if not force_refresh and (now - _last_ollama_healthcheck_at) < OLLAMA_HEALTHCHECK_TTL_SECONDS:
        return _last_ollama_healthcheck_result

    _last_ollama_healthcheck_result = check_ollama_available()
    _last_ollama_healthcheck_at = now
    return _last_ollama_healthcheck_result

logger.info(f"Ollama available at startup: {is_ollama_available(force_refresh=True)}")


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
    Äáº£m báº£o cÃ¡c giÃ¡ trá»‹ macro luÃ´n há»£p lÃ½
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
    if goal.lower() in ["lose", "weight_loss", "giam_can", "giáº£m cÃ¢n"]:
        calories = int(tdee * 0.85)  # 15% deficit
    elif goal.lower() in ["gain", "weight_gain", "tang_can", "tÄƒng cÃ¢n"]:
        calories = int(tdee * 1.15)  # 15% surplus
    else:
        calories = int(tdee)
    
    # Macro distribution theo tá»· lá»‡ chuáº©n
    # Protein: 25%, Carbs: 50%, Fat: 25%
    protein = int(calories * 0.25 / 4)  # 25% calories from protein (4 kcal/g)
    carbs = int(calories * 0.50 / 4)    # 50% calories from carbs (4 kcal/g)
    fat = int(calories * 0.25 / 9)      # 25% calories from fat (9 kcal/g)
    
    # Logging Ä‘á»ƒ debug
    logger.info(f"Formula calculated: cal={calories}, p={protein}, c={carbs}, f={fat}")
    
    # Táº¡o explanation dá»±a trÃªn goal
    goal_explanations = {
        "lose": f"Giáº£m 15% TDEE ({int(tdee)}â†’{calories}kcal) Ä‘á»ƒ giáº£m cÃ¢n an toÃ n. Protein cao giá»¯ cÆ¡ báº¯p.",
        "weight_loss": f"Giáº£m 15% TDEE Ä‘á»ƒ giáº£m cÃ¢n. Duy trÃ¬ protein {protein}g/ngÃ y Ä‘á»ƒ trÃ¡nh máº¥t cÆ¡.",
        "giam_can": f"Giáº£m 15% nÄƒng lÆ°á»£ng hÃ ng ngÃ y. Carbs {carbs}g Ä‘á»§ cho hoáº¡t Ä‘á»™ng cÆ¡ báº£n.",
        "gain": f"TÄƒng 15% TDEE ({int(tdee)}â†’{calories}kcal) Ä‘á»ƒ tÄƒng cÃ¢n. Carbs cao há»— trá»£ táº­p luyá»‡n.",
        "weight_gain": f"TÄƒng 15% TDEE Ä‘á»ƒ tÄƒng cÆ¡. Protein {protein}g, Carbs {carbs}g cho nÄƒng lÆ°á»£ng.",
        "tang_can": f"TÄƒng 15% nÄƒng lÆ°á»£ng. Æ¯u tiÃªn carbs {carbs}g Ä‘á»ƒ há»— trá»£ phÃ¡t triá»ƒn cÆ¡.",
        "maintain": f"Duy trÃ¬ TDEE {calories}kcal. PhÃ¢n bá»• chuáº©n: 25% Protein, 50% Carbs, 25% Fat."
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

# General cache cho táº¥t cáº£ Ollama queries
_general_cache = SimpleCache(default_ttl=300)  # 5 phÃºt máº·c Ä‘á»‹nh

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
    if not is_ollama_available():
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
    if not is_ollama_available():
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
    Sá»­ dá»¥ng Chain-of-Thought + Few-shot prompting Ä‘á»ƒ Ä‘áº£m báº£o káº¿t quáº£ chÃ­nh xÃ¡c
    """
    # Prompt vá»›i hÆ°á»›ng dáº«n tÃ­nh toÃ¡n chi tiáº¿t
    prompt = f"""Báº¡n lÃ  chuyÃªn gia dinh dÆ°á»¡ng. TÃ­nh má»¥c tiÃªu dinh dÆ°á»¡ng hÃ ng ngÃ y CHÃNH XÃC.

CÃ”NG THá»¨C TÃNH:
1. BMR (Mifflin-St Jeor):
   - Nam: BMR = 10 Ã— cÃ¢n_náº·ng + 6.25 Ã— chiá»u_cao - 5 Ã— tuá»•i + 5
   - Ná»¯: BMR = 10 Ã— cÃ¢n_náº·ng + 6.25 Ã— chiá»u_cao - 5 Ã— tuá»•i - 161

2. TDEE = BMR Ã— Activity Multiplier:
   - sedentary/Ãt váº­n Ä‘á»™ng: 1.2
   - light/Nháº¹ nhÃ ng: 1.375
   - moderate/Vá»«a pháº£i: 1.55
   - active/TÃ­ch cá»±c: 1.725
   - very_active/Ráº¥t tÃ­ch cá»±c: 1.9

3. Äiá»u chá»‰nh theo má»¥c tiÃªu:
   - lose/Giáº£m cÃ¢n: TDEE Ã— 0.85 (-15%)
   - maintain/Duy trÃ¬: TDEE Ã— 1.0
   - gain/TÄƒng cÃ¢n: TDEE Ã— 1.15 (+15%)

4. PhÃ¢n bá»• Macro (% calories):
   - Protein: 25% (chia 4 Ä‘á»ƒ ra gram)
   - Carbs: 50% (chia 4 Ä‘á»ƒ ra gram)
   - Fat: 25% (chia 9 Ä‘á»ƒ ra gram)

VÃ Dá»¤ - Nam, 25 tuá»•i, 170cm, 65kg, moderate, maintain:
Output: {{"calories": 2461, "protein": 154, "carbs": 307, "fat": 68, "explanation": "BMR cá»§a báº¡n lÃ  1588kcal. Vá»›i má»©c váº­n Ä‘á»™ng vá»«a pháº£i (x1.55), TDEE = 2461kcal. Äá»ƒ duy trÃ¬ cÃ¢n náº·ng, báº¡n cáº§n 2461kcal/ngÃ y vá»›i 154g protein Ä‘á»ƒ duy trÃ¬ cÆ¡ báº¯p."}}

THÃ”NG TIN NGÆ¯á»œI DÃ™NG: {gender}, {age} tuá»•i, {height_cm}cm, {weight_kg}kg, má»©c váº­n Ä‘á»™ng: {activity_level}, má»¥c tiÃªu: {goal}

TRáº¢ Lá»œI JSON Vá»šI explanation GIáº¢I THÃCH LÃ DO Cá»¤ THá»‚ (táº¡i sao set nhá»¯ng con sá»‘ Ä‘Ã³, dá»±a vÃ o thÃ´ng tin gÃ¬):"""

    response = query_ollama(prompt)
    
    if response:
        try:
            # Try to extract JSON from response
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                json_str = response[start:end]
                result = json.loads(json_str)
                
                # Validation: kiá»ƒm tra cÃ¡c giÃ¡ trá»‹ cÃ³ há»£p lÃ½ khÃ´ng
                calories = int(result.get("calories", 0))
                protein = int(result.get("protein", 0))
                carbs = int(result.get("carbs", 0))
                fat = int(result.get("fat", 0))
                
                # Náº¿u carbs = 0 hoáº·c quÃ¡ tháº¥p -> tÃ­nh láº¡i báº±ng cÃ´ng thá»©c
                if carbs < 50 or calories < 1000 or protein < 30:
                    logger.warning(f"Ollama tráº£ vá» káº¿t quáº£ khÃ´ng há»£p lÃ½: cal={calories}, p={protein}, c={carbs}, f={fat}")
                    logger.info("Sá»­ dá»¥ng cÃ´ng thá»©c Mifflin-St Jeor Ä‘á»ƒ Ä‘áº£m báº£o chÃ­nh xÃ¡c")
                    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
                    result["source"] = "formula_validated"
                    result["explanation"] = "Sá»­ dá»¥ng cÃ´ng thá»©c Mifflin-St Jeor (chuáº©n y khoa)"
                    return result
                
                result["source"] = "ollama"
                result["calories"] = calories
                result["protein"] = protein
                result["carbs"] = carbs
                result["fat"] = fat
                # Táº¡o explanation Cá»¤ THá»‚ vá»›i lÃ½ do vÃ  sá»‘ liá»‡u
                if not result.get("explanation"):
                    goal_explanations = {
                        "lose": f"Má»¥c tiÃªu giáº£m cÃ¢n: {calories}kcal/ngÃ y (giáº£m 15% so vá»›i nhu cáº§u). Protein {protein}g Ä‘á»ƒ khÃ´ng máº¥t cÆ¡.",
                        "gain": f"Má»¥c tiÃªu tÄƒng cÃ¢n: {calories}kcal/ngÃ y (tÄƒng 15% so vá»›i nhu cáº§u). Carbs {carbs}g há»— trá»£ táº­p luyá»‡n.",
                        "maintain": f"Duy trÃ¬ cÃ¢n náº·ng: {calories}kcal/ngÃ y. Macro cÃ¢n báº±ng 25% Protein, 50% Carbs, 25% Fat."
                    }
                    result["explanation"] = goal_explanations.get(goal.lower(), f"Dá»±a trÃªn thÃ´ng tin cÆ¡ thá»ƒ: {calories}kcal, P:{protein}g, C:{carbs}g, F:{fat}g.")
                return result
                
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Ollama response: {response[:100]}")
    
    # Fallback to formula - vá»›i explanation chi tiáº¿t
    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    result["source"] = "formula"
    # Giá»¯ explanation tá»« formula (Ä‘Ã£ cÃ³ chi tiáº¿t vá» TDEE, goal)
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
    if is_ollama_available():
        logger.info("Using Ollama local LLM")
        return get_nutrition_advice_ollama(
            gender, age, height_cm, weight_kg, activity_level, goal
        )
    
    # Priority 2: Formula fallback (Mifflin-St Jeor - chuáº©n y khoa)
    logger.info("Ollama not available, using Mifflin-St Jeor formula fallback")
    result = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    result["source"] = "formula"
    result["explanation"] = "Sá»­ dá»¥ng cÃ´ng thá»©c Mifflin-St Jeor (chuáº©n y khoa) - AI táº¡m thá»i khÃ´ng kháº£ dá»¥ng"
    return result


def get_meal_insight(
    meal_items: list,
    total_calories: int,
    target_calories: int,
    current_macros: Dict[str, int],
    target_macros: Dict[str, int],
    user_history: Optional[Dict[str, Any]] = None  # ThÃªm user history cho personalization
) -> Dict[str, Any]:
    """
    Get AI insight about a meal (Ollama or fallback)
    Improved vá»›i few-shot examples, context analysis, vÃ  personalization
    
    Args:
        user_history: Optional dict chá»©a:
            - favorite_foods: list cÃ¡c mÃ³n hay Äƒn
            - avg_calories_7d: calories trung bÃ¬nh 7 ngÃ y
            - consistency_score: Ä‘iá»ƒm consistency (0-100)
            - common_deficit: thiáº¿u gÃ¬ thÆ°á»ng xuyÃªn (protein/carbs/fat)
    """
    if not is_ollama_available():
        return {
            "insight": "AI chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh. HÃ£y cÃ i Ä‘áº·t Ollama Ä‘á»ƒ nháº­n phÃ¢n tÃ­ch.",
            "suggestions": [],
            "score": 5,
            "source": "none"
        }
    
    items_str = ", ".join([f"{item.get('name', 'Unknown')}" for item in meal_items[:5]])
    
    # TÃ­nh toÃ¡n context
    cal_pct = (total_calories / target_calories * 100) if target_calories > 0 else 0
    protein_current = current_macros.get('protein', 0)
    protein_target = target_macros.get('protein', 0)
    protein_pct = (protein_current / protein_target * 100) if protein_target > 0 else 0
    
    cal_status = "Ä‘á»§" if 85 <= cal_pct <= 115 else ("thiáº¿u" if cal_pct < 85 else "thá»«a")
    protein_status = "Ä‘á»§" if 85 <= protein_pct <= 115 else ("thiáº¿u" if protein_pct < 85 else "thá»«a")
    
    # Build personalization context tá»« user history
    personalization_context = ""
    if user_history:
        if user_history.get('favorite_foods'):
            fav_foods = ", ".join(user_history['favorite_foods'][:3])
            personalization_context += f"\n- MÃ³n hay Äƒn: {fav_foods}"
        if user_history.get('avg_calories_7d'):
            personalization_context += f"\n- Calories trung bÃ¬nh 7 ngÃ y: {user_history['avg_calories_7d']:.0f}kcal"
        if user_history.get('common_deficit'):
            personalization_context += f"\n- ThÆ°á»ng thiáº¿u: {user_history['common_deficit']}"
        if user_history.get('consistency_score'):
            personalization_context += f"\n- Äiá»ƒm consistency: {user_history['consistency_score']:.0f}%"
    
    prompt = f"""PhÃ¢n tÃ­ch dinh dÆ°á»¡ng ngÃ y hÃ´m nay. Tráº£ lá»i ngáº¯n gá»n vÃ  thá»±c táº¿.

THÃ”NG TIN HÃ”M NAY:
- MÃ³n Ä‘Ã£ Äƒn: {items_str}
- Calories: {total_calories}/{target_calories} kcal ({cal_pct:.0f}%) â†’ {cal_status}
- Protein: {protein_current}/{protein_target}g ({protein_pct:.0f}%) â†’ {protein_status}
- Carbs: {current_macros.get('carbs', 0)}g, Fat: {current_macros.get('fat', 0)}g
{personalization_context}

QUY Táº®C:
- Náº¿u calories < 85%: gá»£i Ã½ Äƒn thÃªm (Æ°u tiÃªn mÃ³n user hay Äƒn náº¿u cÃ³)
- Náº¿u calories > 115%: gá»£i Ã½ giáº£m bá»¯a cÃ²n láº¡i
- Náº¿u protein tháº¥p: gá»£i Ã½ thÃªm thá»‹t/trá»©ng/cÃ¡
- Náº¿u cÃ³ mÃ³n hay Äƒn: gá»£i Ã½ mÃ³n Ä‘Ã³ Ä‘á»ƒ tÄƒng adherence
- Score 8-10: ráº¥t tá»‘t, 6-7: á»•n, 3-5: cáº§n cáº£i thiá»‡n

VÃ Dá»¤ 1 (Ä‘áº¡t má»¥c tiÃªu):
Input: Calories 1800/2000 (90%), Protein 100/120g (83%)
â†’ {{"insight": "Báº¡n Ä‘ang theo dÃµi tá»‘t! CÃ²n 200kcal vÃ  20g protein cho bá»¯a cÃ²n láº¡i.", "score": 8, "suggestions": ["ThÃªm 100g á»©c gÃ  hoáº·c 2 quáº£ trá»©ng"]}}

VÃ Dá»¤ 2 (thiáº¿u nhiá»u, cÃ³ mÃ³n hay Äƒn):
Input: Calories 600/2000 (30%), Protein 30/120g (25%), MÃ³n hay Äƒn: phá»Ÿ bÃ², cÆ¡m gÃ 
â†’ {{"insight": "Báº¡n má»›i Äƒn 30% má»¥c tiÃªu. Thá»­ Äƒn phá»Ÿ bÃ² hoáº·c cÆ¡m gÃ  báº¡n hay thÃ­ch!", "score": 5, "suggestions": ["Ä‚n phá»Ÿ bÃ² (500kcal)", "Hoáº·c cÆ¡m gÃ  (600kcal)"]}}

VÃ Dá»¤ 3 (thá»«a):
Input: Calories 2500/2000 (125%), Protein 150/120g (125%)
â†’ {{"insight": "Báº¡n Ä‘Ã£ vÆ°á»£t má»¥c tiÃªu 500kcal. Háº¡n cháº¿ Äƒn thÃªm hÃ´m nay.", "score": 6, "suggestions": ["Bá» qua bá»¯a phá»¥ hÃ´m nay", "Uá»‘ng nhiá»u nÆ°á»›c"]}}

TRáº¢ Lá»œI JSON (chá»‰ JSON, khÃ´ng giáº£i thÃ­ch):"""

    response = query_ollama(prompt, use_cache=True, cache_ttl=120)  # Cache 2 phÃºt
    
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
    
    # Smart fallback vá»›i logic cá»¥ thá»ƒ
    if cal_pct >= 115:
        insight = f"Báº¡n Ä‘Ã£ vÆ°á»£t {cal_pct - 100:.0f}% má»¥c tiÃªu. Háº¡n cháº¿ Äƒn thÃªm."
        suggestions = ["Uá»‘ng nÆ°á»›c thay Ä‘á»“ uá»‘ng cÃ³ Ä‘Æ°á»ng", "Táº­p nháº¹ 20-30 phÃºt"]
        score = 6
    elif cal_pct < 50:
        insight = f"Má»›i Äƒn {cal_pct:.0f}% má»¥c tiÃªu. Äá»«ng quÃªn Äƒn Ä‘á»§ bá»¯a!"
        suggestions = ["Ä‚n thÃªm bá»¯a chÃ­nh Ä‘áº§y Ä‘á»§", "Bá»• sung rau xanh vÃ  protein"]
        score = 5
    elif cal_pct < 85:
        remaining = target_calories - total_calories
        suggestions = [f"Cáº§n thÃªm khoáº£ng {remaining}kcal"]
        if protein_pct < 80:
            suggestions.append("Æ¯u tiÃªn thÃªm protein (thá»‹t, trá»©ng, cÃ¡)")
        insight = f"CÃ²n {remaining}kcal Ä‘á»ƒ Ä‘áº¡t má»¥c tiÃªu."
        score = 6
    else:
        insight = f"Tuyá»‡t vá»i! Báº¡n Ä‘ang theo dÃµi tá»‘t ({cal_pct:.0f}% má»¥c tiÃªu)."
        suggestions = ["Giá»¯ vá»¯ng nhá»‹p nÃ y!"]
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
    Gá»i Ollama AI Ä‘á»ƒ generate hÆ°á»›ng dáº«n náº¥u Äƒn chi tiáº¿t
    Improved vá»›i few-shot examples vÃ  cooking tips
    
    Args:
        recipe_name: TÃªn mÃ³n Äƒn
        ingredients: List cÃ¡c nguyÃªn liá»‡u [{foodName, grams}, ...]
        description: MÃ´ táº£ mÃ³n Äƒn (optional)
    
    Returns:
        Dict vá»›i steps: list cÃ¡c bÆ°á»›c náº¥u, cookingTime, difficulty, tips
    """
    # Check Ollama availability first
    if not is_ollama_available():
        logger.warning("Ollama not available for cooking instructions, using fallback")
        return _generate_fallback_instructions(recipe_name, ingredients)
    
    # Format ingredients list vá»›i thÃ´ng tin chi tiáº¿t
    ingredients_str = ", ".join([
        f"{ing.get('foodName', 'Unknown')} ({ing.get('grams', 100)}g)"
        for ing in ingredients
    ])
    
    # Calculate approximate macros for context
    total_protein = sum(ing.get('protein', 0) for ing in ingredients)
    total_cals = sum(ing.get('calories', 0) for ing in ingredients)
    
    prompt = f"""Báº¡n lÃ  Ä‘áº§u báº¿p chuyÃªn nghiá»‡p ngÆ°á»i Viá»‡t vá»›i 15 nÄƒm kinh nghiá»‡m. HÆ°á»›ng dáº«n náº¥u mÃ³n Äƒn Cá»°C Ká»² CHI TIáº¾T.

MÃ“N Ä‚N: "{recipe_name}"
NGUYÃŠN LIá»†U: {ingredients_str}
{f"MÃ” Táº¢: {description}" if description else ""}

â”â”â” YÃŠU Cáº¦U Báº®T BUá»˜C â”â”â”

1. **CHI TIáº¾T TUYá»†T Äá»I**: Má»—i bÆ°á»›c pháº£i cÃ³:
   â€¢ Thá»i gian cá»¥ thá»ƒ (phÃºt/giÃ¢y)
   â€¢ Nhiá»‡t Ä‘á»™/má»©c lá»­a (lá»›n/vá»«a/nhá», sá»‘ Ä‘á»™ C náº¿u nÆ°á»›ng)
   â€¢ Ká»¹ thuáº­t náº¥u rÃµ rÃ ng (xÃ o/luá»™c/háº¥p/chiÃªn)
   â€¢ Dáº¥u hiá»‡u nháº­n biáº¿t (vÃ ng/chÃ­n/má»m/giÃ²n)
   â€¢ LÆ°á»£ng gia vá»‹ Cá»¤ THá»‚ (muá»—ng cÃ  phÃª/canh, gram)

2. **Cáº¤U TRÃšC**: 7-10 bÆ°á»›c, má»—i bÆ°á»›c 2-3 cÃ¢u
   â€¢ BÆ°á»›c 1-2: SÆ¡ cháº¿ nguyÃªn liá»‡u (rá»­a, thÃ¡i, Æ°á»›p)
   â€¢ BÆ°á»›c 3-7: Náº¥u chÃ­nh (chi tiáº¿t tá»«ng cÃ´ng Ä‘oáº¡n)
   â€¢ BÆ°á»›c 8-10: HoÃ n thiá»‡n vÃ  trang trÃ­

3. **TIPS THá»°C CHIáº¾N**: 3-4 tips há»¯u Ã­ch:
   â€¢ Máº¹o Ä‘á»ƒ mÃ³n ngon hÆ¡n
   â€¢ CÃ¡ch trÃ¡nh lá»—i thÆ°á»ng gáº·p
   â€¢ Biáº¿n táº¥u cho ngÆ°á»i báº­n rá»™n
   â€¢ Báº£o quáº£n vÃ  hÃ¢m nÃ³ng

4. **THÃ”NG TIN Bá»” SUNG**:
   â€¢ Thá»i gian náº¥u THá»°C Táº¾ (tÃ­nh cáº£ sÆ¡ cháº¿)
   â€¢ Äá»™ khÃ³ (Ráº¥t dá»…/Dá»…/Trung bÃ¬nh/KhÃ³)
   â€¢ LÆ°u Ã½ quan trá»ng (náº¿u cÃ³)

â”â”â” VÃ Dá»¤ CHUáº¨N (PHáº¢I CHI TIáº¾T NHÆ¯ Váº¬Y) â”â”â”

Input: CÆ¡m gÃ  xÃ o rau cá»§ - GÃ (150g), CÆ¡m(200g), BÃ´ng cáº£i xanh(100g)

Output:
{{
  "steps": [
    "Rá»­a sáº¡ch 150g á»©c gÃ , tháº¥m khÃ´ báº±ng giáº¥y Äƒn. ThÃ¡i miáº¿ng vuÃ´ng 2x2cm (khoáº£ng 10-12 miáº¿ng). Æ¯á»›p vá»›i 1/2 muá»—ng cÃ  phÃª muá»‘i, 1/2 muá»—ng cÃ  phÃª háº¡t nÃªm, 1 muá»—ng cÃ  phÃª dáº§u Äƒn. Trá»™n Ä‘á»u, Ä‘á»ƒ yÃªn 10-15 phÃºt cho tháº¥m gia vá»‹.",
    
    "Rá»­a 100g bÃ´ng cáº£i xanh, cáº¯t thÃ nh tá»«ng bÃ´ng nhá» (khoáº£ng 3-4cm). Äun sÃ´i 500ml nÆ°á»›c + 1/4 muá»—ng cÃ  phÃª muá»‘i. Cháº§n bÃ´ng cáº£i Ä‘Ãºng 2 phÃºt (Ä‘áº¿m tá»« khi nÆ°á»›c sÃ´i láº¡i), vá»›t ra ngÃ¢m ngay vÃ o bÃ¡t nÆ°á»›c Ä‘Ã¡ 1 phÃºt Ä‘á»ƒ giá»¯ mÃ u xanh giÃ²n.",
    
    "Báº¯c cháº£o chá»‘ng dÃ­nh lÃªn báº¿p, cho 2 muá»—ng canh dáº§u Äƒn. Äun á»Ÿ lá»­a vá»«a Ä‘áº¿n khi dáº§u nÃ³ng (thá»­ báº±ng Ä‘Å©a tháº¥y sá»§i bá»t nhá» xung quanh). TÄƒng lá»­a lá»›n.",
    
    "Cho gÃ  Ä‘Ã£ Æ°á»›p vÃ o cháº£o, xáº¿p thÃ nh 1 lá»›p Ä‘á»u. KHÃ”NG Ä‘áº£o ngay! Äá»ƒ yÃªn 1.5 phÃºt cho gÃ  chÃ­n vÃ ng máº·t dÆ°á»›i. Sau Ä‘Ã³ Ä‘áº£o Ä‘á»u, xÃ o thÃªm 2-3 phÃºt Ä‘áº¿n khi gÃ  chÃ­n vÃ ng Ä‘á»u, khÃ´ng cÃ²n há»“ng bÃªn trong. Vá»›t gÃ  ra Ä‘Ä©a riÃªng.",
    
    "Giá»¯ nguyÃªn cháº£o (khÃ´ng rá»­a), cho thÃªm 1 muá»—ng cÃ  phÃª dáº§u náº¿u khÃ´. Cho bÃ´ng cáº£i Ä‘Ã£ cháº§n vÃ o, xÃ o nhanh trÃªn lá»­a lá»›n 1.5 phÃºt. ThÃªm 2 muá»—ng canh nÆ°á»›c lá»c Ä‘á»ƒ táº¡o hÆ¡i nÆ°á»›c.",
    
    "Cho gÃ  Ä‘Ã£ xÃ o trá»Ÿ láº¡i cháº£o cÃ¹ng bÃ´ng cáº£i. NÃªm 1 muá»—ng canh nÆ°á»›c máº¯m, 1/2 muá»—ng cÃ  phÃª Ä‘Æ°á»ng, 1/4 muá»—ng cÃ  phÃª tiÃªu. Äáº£o Ä‘á»u trong 1 phÃºt cho gia vá»‹ tháº¥m. Náº¿m thá»­ vÃ  Ä‘iá»u chá»‰nh.",
    
    "Táº¯t báº¿p. XÃºc 200g cÆ¡m nÃ³ng ra Ä‘Ä©a, xáº¿p gÃ  xÃ o rau lÃªn trÃªn. Ráº¯c thÃªm 1 nhÃºm tiÃªu Ä‘en xay vÃ  rau mÃ¹i tÆ°Æ¡i (tÃ¹y chá»n). Ä‚n nÃ³ng ngay Ä‘á»ƒ giá»¯ Ä‘á»™ giÃ²n cá»§a rau."
  ],
  
  "cookingTime": "25-30 phÃºt (sÆ¡ cháº¿ 10 phÃºt, náº¥u 15-20 phÃºt)",
  
  "difficulty": "Dá»…",
  
  "tips": [
    "BÃ­ quyáº¿t gÃ  má»m: Æ¯á»›p Ã­t dáº§u Äƒn giÃºp khÃ³a nÆ°á»›c, khÃ´ng bá»‹ khÃ´. XÃ o lá»­a lá»›n vÃ  NHANH (tá»‘i Ä‘a 5 phÃºt) Ä‘á»ƒ gÃ  khÃ´ng dai.",
    
    "Rau giÃ²n xanh: Cháº§n qua nÆ°á»›c sÃ´i rá»“i ngÃ¢m nÆ°á»›c Ä‘Ã¡ lÃ  bÆ°á»›c QUAN TRá»ŒNG. Bá» qua sáº½ lÃ m rau nhÅ©n vÃ  xá»‰n mÃ u.",
    
    "Biáº¿n táº¥u nhanh: KhÃ´ng cÃ³ thá»i gian? DÃ¹ng gÃ  xÃ© sáºµn tá»« siÃªu thá»‹, rau Ä‘Ã´ng láº¡nh. Thá»i gian giáº£m cÃ²n 10 phÃºt.",
    
    "Báº£o quáº£n: Äá»ƒ riÃªng cÆ¡m vÃ  gÃ  xÃ o. Báº£o quáº£n tá»§ láº¡nh 2 ngÃ y. HÃ¢m nÃ³ng: Vi sÃ³ng 2 phÃºt hoáº·c cháº£o 3 phÃºt."
  ],
  
  "notes": "MÃ³n nÃ y cung cáº¥p khoáº£ng 450kcal, 35g protein - phÃ¹ há»£p cho bá»¯a trÆ°a/tá»‘i. CÃ³ thá»ƒ thay gÃ  báº±ng tÃ´m (giáº£m thá»i gian xÃ o xuá»‘ng 2 phÃºt) hoáº·c Ä‘áº­u hÅ© (cho ngÆ°á»i Äƒn chay)."
}}

â”â”â” Báº®T Äáº¦U Táº O HÆ¯á»šNG DáºªN â”â”â”

TRáº¢ Lá»œI JSON há»£p lá»‡, KHÃ”NG giáº£i thÃ­ch thÃªm. Pháº£i CHI TIáº¾T nhÆ° vÃ­ dá»¥ trÃªn:"""

    response = query_ollama(prompt, use_cache=True, cache_ttl=600)  # Cache 10 phÃºt cho recipe
    
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
    
    # Fallback khi Ollama khÃ´ng tráº£ vá» káº¿t quáº£ há»£p lá»‡
    logger.warning(f"Ollama failed for cooking instructions, using fallback for {recipe_name}")
    return _generate_fallback_instructions(recipe_name, ingredients)


def _generate_fallback_instructions(recipe_name: str, ingredients: list[dict]) -> Dict[str, Any]:
    """
    Táº¡o hÆ°á»›ng dáº«n náº¥u Äƒn máº·c Ä‘á»‹nh khi Ollama khÃ´ng kháº£ dá»¥ng
    """
    # Láº¥y tÃªn cÃ¡c nguyÃªn liá»‡u
    ing_names = [ing.get('foodName', 'nguyÃªn liá»‡u') for ing in ingredients[:5]]
    
    steps = [
        f"SÆ¡ cháº¿ vÃ  rá»­a sáº¡ch cÃ¡c nguyÃªn liá»‡u: {', '.join(ing_names)}",
        "Cáº¯t hoáº·c thÃ¡i nguyÃªn liá»‡u theo kÃ­ch thÆ°á»›c phÃ¹ há»£p",
        f"Cho dáº§u Äƒn vÃ o cháº£o, Ä‘un nÃ³ng á»Ÿ lá»­a vá»«a",
        f"Cho cÃ¡c nguyÃªn liá»‡u vÃ o cháº£o theo thá»© tá»±, Ä‘áº£o Ä‘á»u",
        "NÃªm gia vá»‹ theo kháº©u vá»‹ (muá»‘i, tiÃªu, nÆ°á»›c máº¯m)",
        f"Trang trÃ­ vÃ  thÆ°á»Ÿng thá»©c mÃ³n {recipe_name}"
    ]
    
    return {
        "steps": steps,
        "cookingTime": "20-30 phÃºt",
        "difficulty": "Trung bÃ¬nh",
        "source": "fallback",
        "note": "HÆ°á»›ng dáº«n cÆ¡ báº£n - AI Ä‘ang báº­n, vui lÃ²ng thá»­ láº¡i sau Ä‘á»ƒ cÃ³ hÆ°á»›ng dáº«n chi tiáº¿t hÆ¡n"
    }


# ============== VOICE COMMAND PARSING ==============

import re

# Mapping sá»‘ chá»¯ sang sá»‘
VIETNAMESE_NUMBERS = {
    "khÃ´ng": 0, "má»™t": 1, "hai": 2, "ba": 3, "bá»‘n": 4, "nÄƒm": 5, "sÃ¡u": 6, "báº£y": 7, "tÃ¡m": 8, "chÃ­n": 9,
    "mÆ°á»i": 10, "mÆ°á»i má»™t": 11, "mÆ°á»i hai": 12, "mÆ°á»i ba": 13, "mÆ°á»i bá»‘n": 14, "mÆ°á»i lÄƒm": 15,
    "hai mÆ°Æ¡i": 20, "ba mÆ°Æ¡i": 30, "bá»‘n mÆ°Æ¡i": 40, "nÄƒm mÆ°Æ¡i": 50, "sÃ¡u mÆ°Æ¡i": 60, "báº£y mÆ°Æ¡i": 70, "tÃ¡m mÆ°Æ¡i": 80, "chÃ­n mÆ°Æ¡i": 90,
    "má»™t trÄƒm": 100, "hai trÄƒm": 200, "ba trÄƒm": 300,
}

def parse_vietnamese_number(text: str) -> int:
    """
    Parse sá»‘ tiáº¿ng Viá»‡t sang int. VD: 'hai nghÃ¬n sÃ¡u trÄƒm' -> 2600
    Há»— trá»£: Ä‘Æ¡n vá»‹ (0-9), chá»¥c (10-90), trÄƒm (100-900), nghÃ¬n (1000-9000)
    """
    text = text.lower().strip()
    
    # Náº¿u Ä‘Ã£ lÃ  sá»‘
    if text.isdigit():
        return int(text)
    
    result = 0
    
    # BÆ°á»›c 0: TÃ¬m NGHÃŒN/NGÃ€N (1000-9000)
    thousands_map = {
        "má»™t nghÃ¬n": 1000, "hai nghÃ¬n": 2000, "ba nghÃ¬n": 3000, "bá»‘n nghÃ¬n": 4000,
        "nÄƒm nghÃ¬n": 5000, "sÃ¡u nghÃ¬n": 6000, "báº£y nghÃ¬n": 7000, "tÃ¡m nghÃ¬n": 8000, "chÃ­n nghÃ¬n": 9000,
        "má»™t ngÃ n": 1000, "hai ngÃ n": 2000, "ba ngÃ n": 3000, "bá»‘n ngÃ n": 4000,
        "nÄƒm ngÃ n": 5000, "sÃ¡u ngÃ n": 6000, "báº£y ngÃ n": 7000, "tÃ¡m ngÃ n": 8000, "chÃ­n ngÃ n": 9000,
    }
    for word, val in thousands_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # BÆ°á»›c 1: TÃ¬m TRÄ‚M (100-900)
    hundreds_map = {
        "má»™t trÄƒm": 100, "hai trÄƒm": 200, "ba trÄƒm": 300, "bá»‘n trÄƒm": 400,
        "nÄƒm trÄƒm": 500, "sÃ¡u trÄƒm": 600, "báº£y trÄƒm": 700, "tÃ¡m trÄƒm": 800, "chÃ­n trÄƒm": 900
    }
    for word, val in hundreds_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # BÆ°á»›c 2: TÃ¬m CHá»¤C (10-90)
    tens_map = {
        "mÆ°á»i": 10, "hai mÆ°Æ¡i": 20, "ba mÆ°Æ¡i": 30, "bá»‘n mÆ°Æ¡i": 40,
        "nÄƒm mÆ°Æ¡i": 50, "sÃ¡u mÆ°Æ¡i": 60, "báº£y mÆ°Æ¡i": 70, "tÃ¡m mÆ°Æ¡i": 80, "chÃ­n mÆ°Æ¡i": 90
    }
    for word, val in tens_map.items():
        if word in text:
            result += val
            text = text.replace(word, "").strip()
            break
    
    # BÆ°á»›c 3: TÃ¬m ÄÆ N Vá»Š (1-9)
    text = text.replace("lÄƒm", "nÄƒm").replace("má»‘t", "má»™t")
    text = text.replace("linh", "").replace("láº»", "").strip()
    
    units_map = {
        "má»™t": 1, "hai": 2, "ba": 3, "bá»‘n": 4, "nÄƒm": 5,
        "sÃ¡u": 6, "báº£y": 7, "tÃ¡m": 8, "chÃ­n": 9
    }
    for word, val in units_map.items():
        if word in text:
            result += val
            break
    
    return result if result > 0 else 0


def preprocess_vietnamese_numbers(text: str) -> str:
    """
    Tiá»n xá»­ lÃ½: Chuyá»ƒn sá»‘ tiáº¿ng Viá»‡t thÃ nh sá»‘ digit.
    VD: "thÃªm sÃ¡u trÄƒm gam gÃ " -> "thÃªm 600gam gÃ "
    VD: "hai nghÃ¬n calo" -> "2000 calo"
    """
    import re
    
    # Pattern Ä‘á»ƒ tÃ¬m sá»‘ tiáº¿ng Viá»‡t + Ä‘Æ¡n vá»‹ (gam/g/gram/kÃ½/kg/calo)
    # Há»— trá»£: nghÃ¬n/ngÃ n, trÄƒm, chá»¥c, Ä‘Æ¡n vá»‹
    number_words = r"((?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n)\s*(?:nghÃ¬n|ngÃ n)(?:\s*(?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n)\s*trÄƒm)?(?:\s*(?:linh|láº»)?\s*(?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n|mÆ°á»i|mÆ°Æ¡i|lÄƒm|má»‘t))*|(?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n)\s*trÄƒm(?:\s*(?:linh|láº»)?\s*(?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n|mÆ°á»i|mÆ°Æ¡i|lÄƒm|má»‘t))*|(?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n|mÆ°á»i)\s*(?:mÆ°Æ¡i|mÆ°á»i)?(?:\s*(?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n|lÄƒm|má»‘t))?)"
    unit_words = r"\s*(gam|g|gram|kÃ½|kg|kilogram|calo|calories|kcal)"
    
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
    """Regex Ä‘á»ƒ parse LOG_WEIGHT. Tráº£ vá» None náº¿u khÃ´ng match."""
    lower = text.lower().strip()
    
    # Pattern: sá»‘ + kÃ½/kg/kilogram (khÃ´ng cÃ³ "calo/calories")
    # VD: "hÃ´m nay tÃ´i 70 kÃ½", "cÃ¢n náº·ng 65 kg", "tÃ´i báº£y mÆ°Æ¡i lÄƒm kÃ½"
    
    # KhÃ´ng match náº¿u cÃ³ "calo"
    if "calo" in lower or "calories" in lower or "kcal" in lower:
        return None
    
    # Pattern vá»›i sá»‘
    pattern_number = r"(?:cÃ¢n náº·ng|tÃ´i|náº·ng)\s*(?:lÃ \s+)?(\d+(?:\.\d+)?)\s*(?:kÃ½|kg|kilogram)?"
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
    
    # Pattern vá»›i sá»‘ chá»¯: "tÃ´i báº£y mÆ°Æ¡i lÄƒm kÃ½", "má»™t trÄƒm kÃ½"
    # ThÃªm "trÄƒm", "linh", "láº»" vÃ o pattern
    pattern_text = r"(?:cÃ¢n náº·ng|tÃ´i|náº·ng)\s*((?:má»™t|hai|ba|bá»‘n|nÄƒm|sÃ¡u|báº£y|tÃ¡m|chÃ­n|mÆ°á»i|mÆ°Æ¡i|lÄƒm|má»‘t|trÄƒm|linh|láº»|\s)+)\s*(?:kÃ½|kg|kilogram)"
    match = re.search(pattern_text, lower, re.IGNORECASE)
    if match:
        weight = parse_vietnamese_number(match.group(1))
        # Náº¿u parse ra 0 (failed) nhÆ°ng text cÃ³ "má»™t trÄƒm" -> thá»§ cÃ´ng fix
        if weight == 0 and "má»™t trÄƒm" in lower:
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
    """Regex Ä‘á»ƒ parse ASK_CALORIES. Tráº£ vá» None náº¿u khÃ´ng match."""
    lower = text.lower().strip()
    
    # Pattern: "bao nhiÃªu calo", "Äƒn bao nhiÃªu calo", "tiÃªu thá»¥ máº¥y calo"
    # QUAN TRá»ŒNG: Pháº£i cÃ³ tá»« "calo/calories/kcal/nÄƒng lÆ°á»£ng"
    pattern = r"(?:Äƒn|tiÃªu thá»¥|náº¡p|uá»‘ng)?\s*(?:Ä‘Æ°á»£c\s+|Ä‘Ã£\s+)?(?:bao nhiÃªu|tá»•ng|háº¿t|máº¥y)\s*(?:calo|calories|kcal|nÄƒng lÆ°á»£ng)"
    
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
    - "thÃªm 1 bÃ¡t phá»Ÿ 300g bá»¯a trÆ°a"
    - "ghi cÃ¢n náº·ng 65 kg"
    - "hÃ´m nay Äƒn bao nhiÃªu calo"
    
    Returns:
        Dict with intent, entities, confidence, rawText
    """
    
    # ========== BÆ¯á»šC 1: REGEX PRE-PROCESSING ==========
    # Thá»­ match cÃ¡c pattern rÃµ rÃ ng trÆ°á»›c khi gá»i Ollama
    
    # 1.1 Thá»­ parse LOG_WEIGHT
    weight_result = try_parse_weight_regex(text)
    if weight_result:
        logger.info(f"Voice parsed by REGEX: LOG_WEIGHT, weight={weight_result['entities'].get('weight')}")
        return weight_result
    
    # 1.2 Thá»­ parse ASK_CALORIES
    calories_result = try_parse_ask_calories_regex(text)
    if calories_result:
        logger.info(f"Voice parsed by REGEX: ASK_CALORIES")
        return calories_result
    
    # ========== BÆ¯á»šC 2: OLLAMA LLM (cho ADD_FOOD vÃ  complex cases) ==========
    if not is_ollama_available():
        logger.warning("Ollama not available for voice parsing")
        return {
            "intent": "UNKNOWN",
            "entities": {},
            "confidence": 0.0,
            "rawText": text,
            "source": "fallback",
            "error": "Ollama khÃ´ng kháº£ dá»¥ng"
        }
    
    # TIá»€N Xá»¬ LÃ: Chuyá»ƒn sá»‘ tiáº¿ng Viá»‡t thÃ nh sá»‘ digit
    # VD: "sÃ¡u trÄƒm gam gÃ " -> "600gam gÃ "
    processed_text = preprocess_vietnamese_numbers(text)
    logger.info(f"Preprocessed text: '{text}' -> '{processed_text}'")
    
    # Prompt cáº£i tiáº¿n: Nháº­n input Ä‘a dáº¡ng, support nhiá»u mÃ³n, fix pattern recognition
    prompt = f"""Báº¡n lÃ  AI phÃ¢n tÃ­ch lá»‡nh giá»ng nÃ³i tiáº¿ng Viá»‡t cho app theo dÃµi calories.

Lá»†NH Cáº¦N PHÃ‚N TÃCH: "{processed_text}"

â”â”â” BÆ¯á»šC 1: XÃC Äá»ŠNH INTENT â”â”â”

âš ï¸ QUAN TRá»ŒNG - THá»¨ Tá»° Æ¯U TIÃŠN:

1. LOG_WEIGHT: Náº¿u cÃ³ Sá» + Ä‘Æ¡n vá»‹ cÃ¢n náº·ng (kÃ½/kg/kilogram)
   Patterns: "tÃ´i X kÃ½", "hÃ´m nay X kg", "cÃ¢n náº·ng X", "náº·ng X"
   VD: "hÃ´m nay tÃ´i 70 kÃ½" â†’ LOG_WEIGHT (KHÃ”NG PHáº¢I ASK_CALORIES!)

2. ASK_CALORIES: CHá»ˆ KHI há»i "bao nhiÃªu calo" vÃ  KHÃ”NG cÃ³ tÃªn mÃ³n cá»¥ thá»ƒ
   Patterns: "Äƒn bao nhiÃªu calo?", "Ä‘Ã£ Äƒn bao nhiÃªu kcal?"
   
3. ADD_FOOD: Náº¿u cÃ³ TÃŠN MÃ“N Ä‚N cá»¥ thá»ƒ (dÃ¹ cÃ³ "Äƒn" hay khÃ´ng)
   Patterns: "thÃªm/ghi/Äƒn [mÃ³n]", "tÃ´i Äƒn [mÃ³n]", "hÃ´m nay Äƒn [mÃ³n]"
   VD: "tÃ´i Äƒn 100g cÆ¡m" â†’ ADD_FOOD (KHÃ”NG PHáº¢I ASK_CALORIES!)
   VD: "thÃªm 100g cÆ¡m vÃ  200g gÃ " â†’ ADD_FOOD vá»›i 2 mÃ³n

4. UNKNOWN: KhÃ´ng khá»›p pattern nÃ o

â”â”â” BÆ¯á»šC 2: TRÃCH XUáº¤T ENTITIES â”â”â”

LOG_WEIGHT:
â€¢ weight: sá»‘ kg (chuyá»ƒn chá»¯ â†’ sá»‘!)
â€¢ Mapping: "báº£y mÆ°Æ¡i"=70, "sÃ¡u mÆ°Æ¡i lÄƒm"=65, "nÄƒm lÄƒm"=55, "bá»‘n lÄƒm"=45

ADD_FOOD (1 mÃ³n):
â€¢ foodName: tÃªn mÃ³n (chá»‰ tÃªn, khÃ´ng sá»‘/Ä‘Æ¡n vá»‹)  
â€¢ quantity: sá»‘ lÆ°á»£ng (1,2,3...) - cho bÃ¡t/Ä‘Ä©a/quáº£
â€¢ weight: sá»‘ gram náº¿u cÃ³ "g/gam/gram"
â€¢ unit: Ä‘Æ¡n vá»‹ Ä‘áº¿m (bÃ¡t/Ä‘Ä©a/quáº£/cÃ¡i/ly)
â€¢ mealType: breakfast/lunch/dinner/snack

ADD_FOOD (NHIá»€U MÃ“N - dÃ¹ng khi cÃ³ "vÃ /vá»›i/cÃ¹ng"):
â€¢ foods: ARRAY cÃ¡c mÃ³n, má»—i mÃ³n cÃ³ {{foodName, weight/quantity, unit}}
â€¢ mealType: bá»¯a Äƒn chung

ASK_CALORIES: entities rá»—ng {{}}

â”â”â” VÃ Dá»¤ THAM KHáº¢O â”â”â”

--- LOG_WEIGHT ---
Input: "hÃ´m nay tÃ´i 70 kÃ½"
â†’ {{"intent":"LOG_WEIGHT","entities":{{"weight":70}},"confidence":0.95}}

Input: "tÃ´i báº£y mÆ°Æ¡i kg"
â†’ {{"intent":"LOG_WEIGHT","entities":{{"weight":70}},"confidence":0.9}}

Input: "cÃ¢n náº·ng sÃ¡u mÆ°Æ¡i lÄƒm"
â†’ {{"intent":"LOG_WEIGHT","entities":{{"weight":65}},"confidence":0.9}}

Input: "hÃ´m nay tÃ´i má»™t trÄƒm hai mÆ°Æ¡i kÃ½"
â†’ {{"intent":"LOG_WEIGHT","entities":{{"weight":120}},"confidence":0.9}}

âš ï¸ CHUYá»‚N Äá»”I Sá» TIáº¾NG VIá»†T:
- "má»™t trÄƒm" = 100, "má»™t trÄƒm hai mÆ°Æ¡i" = 120, "má»™t trÄƒm linh nÄƒm" = 105
- "báº£y mÆ°Æ¡i lÄƒm" = 75, "sÃ¡u mÆ°Æ¡i lÄƒm" = 65, "tÃ¡m mÆ°Æ¡i má»‘t" = 81

--- ADD_FOOD (1 mÃ³n) ---
Input: "tÃ´i Äƒn 150g thá»‹t heo bá»¯a trÆ°a"
â†’ {{"intent":"ADD_FOOD","entities":{{"foodName":"thá»‹t heo","weight":150,"mealType":"lunch"}},"confidence":0.95}}

Input: "thÃªm 2 quáº£ trá»©ng sÃ¡ng nay"
â†’ {{"intent":"ADD_FOOD","entities":{{"foodName":"trá»©ng","quantity":2,"unit":"quáº£","mealType":"breakfast"}},"confidence":0.95}}

--- ADD_FOOD (NHIá»€U MÃ“N) ---
Input: "thÃªm 200g cÃ¡ vÃ  150g rau bá»¯a tá»‘i"
â†’ {{"intent":"ADD_FOOD","entities":{{"foods":[{{"foodName":"cÃ¡","weight":200}},{{"foodName":"rau","weight":150}}],"mealType":"dinner"}},"confidence":0.9}}

Input: "Äƒn 1 bÃ¡t phá»Ÿ vÃ  1 ly trÃ  Ä‘Ã¡"
â†’ {{"intent":"ADD_FOOD","entities":{{"foods":[{{"foodName":"phá»Ÿ","quantity":1,"unit":"bÃ¡t"}},{{"foodName":"trÃ  Ä‘Ã¡","quantity":1,"unit":"ly"}}]}},"confidence":0.9}}

Input: "thÃªm 50g Ä‘áº­u vÃ  100g khoai vÃ  75g ngÃ´"
â†’ {{"intent":"ADD_FOOD","entities":{{"foods":[{{"foodName":"Ä‘áº­u","weight":50}},{{"foodName":"khoai","weight":100}},{{"foodName":"ngÃ´","weight":75}}]}},"confidence":0.85}}

ðŸš« QUY Táº®C TUYá»†T Äá»I - KHÃ”NG ÄÆ¯á»¢C VI PHáº M:
1. CHá»ˆ PARSE NHá»®NG MÃ“N CÃ“ TRONG INPUT! Náº¿u input nÃ³i "gÃ " thÃ¬ CHá»ˆ cÃ³ "gÃ ", KHÃ”NG thÃªm "cÆ¡m" hay mÃ³n khÃ¡c!
2. COPY CHÃNH XÃC tÃªn mÃ³n tá»« input: "gÃ " â†’ "gÃ ", "bÃ²" â†’ "bÃ²", "cÆ¡m" â†’ "cÆ¡m"
3. COPY CHÃNH XÃC sá»‘ gram tá»« input: "100g" â†’ 100, KHÃ”NG tá»± Ä‘á»•i thÃ nh 200
4. Äáº¾M Äá»¦ sá»‘ mÃ³n: náº¿u input cÃ³ 1 mÃ³n thÃ¬ output 1, cÃ³ 2 mÃ³n thÃ¬ output 2, cÃ³ 3 mÃ³n thÃ¬ output 3

ðŸš« VÃ Dá»¤ SAI (KHÃ”NG LÃ€M THáº¾ NÃ€Y):
âŒ Input: "thÃªm 100g gÃ " â†’ Output cÃ³ thÃªm "cÆ¡m" (SAI! Input khÃ´ng cÃ³ cÆ¡m)
âŒ Input: "100g bÃ²" â†’ Output: weight:200 (SAI! Pháº£i lÃ  100)

--- ASK_CALORIES ---
Input: "hÃ´m nay Äƒn bao nhiÃªu calo"  
â†’ {{"intent":"ASK_CALORIES","entities":{{}},"confidence":0.9}}

Input: "tÃ´i Ä‘Ã£ tiÃªu thá»¥ bao nhiÃªu calories"
â†’ {{"intent":"ASK_CALORIES","entities":{{}},"confidence":0.9}}

â”â”â” TRáº¢ Lá»œI â”â”â”
CHá»ˆ tráº£ vá» JSON há»£p lá»‡, KHÃ”NG giáº£i thÃ­ch:"""

    try:
        response = query_ollama(prompt, use_cache=False)  # KhÃ´ng cache voice commands
        
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
                # Loáº¡i bá» cÃ¡c mÃ³n Äƒn khÃ´ng cÃ³ trong input (chá»‘ng hallucination)
                if result["intent"] == "ADD_FOOD":
                    text_lower = text.lower()
                    
                    # Náº¿u cÃ³ nhiá»u mÃ³n (foods array)
                    if "foods" in result.get("entities", {}):
                        valid_foods = []
                        for food in result["entities"]["foods"]:
                            food_name = food.get("foodName", "").lower()
                            # Chá»‰ giá»¯ láº¡i mÃ³n cÃ³ trong input
                            if food_name and food_name in text_lower:
                                valid_foods.append(food)
                            else:
                                logger.warning(f"Filtered hallucinated food: {food_name} (not in input)")
                        
                        if valid_foods:
                            result["entities"]["foods"] = valid_foods
                        else:
                            # KhÃ´ng cÃ²n food nÃ o valid -> UNKNOWN
                            result["intent"] = "UNKNOWN"
                            result["confidence"] = 0.3
                            logger.warning("All foods filtered - returning UNKNOWN")
                    
                    # Náº¿u chá»‰ 1 mÃ³n (foodName)
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
        "error": "KhÃ´ng thá»ƒ phÃ¢n tÃ­ch lá»‡nh"
    }

