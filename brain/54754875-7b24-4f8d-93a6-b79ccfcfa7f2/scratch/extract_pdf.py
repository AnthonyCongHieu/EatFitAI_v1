import pypdf
import os
import sys

# Thiết lập stdout mã hóa utf-8
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\PC\Downloads\dataa báo cáo eatitAI\Rubric@GraduationProject_Final.docx.pdf"
output_path = r"C:\Users\PC\.gemini\antigravity\brain\54754875-7b24-4f8d-93a6-b79ccfcfa7f2\scratch\rubric_extracted.txt"

os.makedirs(os.path.dirname(output_path), exist_ok=True)

print("Starting extraction...")
try:
    reader = pypdf.PdfReader(pdf_path)
    text_content = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        text_content.append(f"--- PAGE {i+1} ---")
        text_content.append(text)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(text_content))
    print("Extraction successful! Saved to scratch/rubric_extracted.txt")
except Exception as e:
    print(f"Error during extraction: {str(e)}")
