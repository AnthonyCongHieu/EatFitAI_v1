
import re

VIETNAMESE_NUMBERS = {
    "không": 0, "một": 1, "hai": 2, "ba": 3, "bốn": 4, "năm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9,
    "mười": 10, "mười một": 11, "mười hai": 12, "mười ba": 13, "mười bốn": 14, "mười lăm": 15,
    "hai mươi": 20, "ba mươi": 30, "bốn mươi": 40, "năm mươi": 50, "sáu mươi": 60, "bảy mươi": 70, "tám mươi": 80, "chín mươi": 90,
    "một trăm": 100, "hai trăm": 200, "ba trăm": 300,
}

def parse_vietnamese_number(text: str) -> int:
    """
    Parse số tiếng Việt sang int. VD: 'một trăm hai mươi lăm' -> 125
    Hỗ trợ: đơn vị (0-9), chục (10-90), trăm (100-300)
    """
    text = text.lower().strip()
    print(f"Parsing: '{text}'")
    
    # Nếu đã là số
    if text.isdigit():
        return int(text)
    
    result = 0
    
    # Bước 1: Tìm TRĂM (100, 200, 300)
    hundreds_map = {"một trăm": 100, "hai trăm": 200, "ba trăm": 300}
    for word, val in hundreds_map.items():
        if word in text:
            print(f"  Found hundreds: '{word}' -> {val}")
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
            print(f"  Found tens: '{word}' -> {val}")
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
            print(f"  Found units: '{word}' -> {val}")
            result += val
            break
    
    return result

# Test cases
print("\n=== TEST CASES ===")
print(f"Result: {parse_vietnamese_number('một trăm')}\n")
print(f"Result: {parse_vietnamese_number('bảy mươi lăm')}\n")
print(f"Result: {parse_vietnamese_number('một trăm hai mươi')}\n")
print(f"Result: {parse_vietnamese_number('một trăm hai mươi lăm')}\n")
print(f"Result: {parse_vietnamese_number('một trăm linh năm')}\n")
