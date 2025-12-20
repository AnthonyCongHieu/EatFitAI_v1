import torch
import os
import logging
from transformers import WhisperForConditionalGeneration, WhisperProcessor, pipeline
import warnings

logger = logging.getLogger(__name__)

# Configuration - Hỗ trợ nhiều model với fallback
# Ưu tiên: PhoWhisper (Vietnamese) > Whisper (Multilingual)
PHOWHISPER_MODEL_ID = "vinai/PhoWhisper-medium"  # Cần HF_TOKEN
WHISPER_FALLBACK_MODEL_ID = "openai/whisper-medium"  # Public model
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
TORCH_DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32

# HuggingFace token từ environment (optional)
HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")

_pipe = None
_current_model = None


def _try_load_model(model_id: str, use_token: bool = False):
    """Thử load một model, trả về (model, processor) hoặc (None, None) nếu fail"""
    try:
        logger.info(f"Trying to load model: {model_id}")
        
        # Suppress deprecation warnings
        warnings.filterwarnings("ignore", message=".*torch_dtype.*")
        
        # Base kwargs
        kwargs = {
            "torch_dtype": TORCH_DTYPE,
            "low_cpu_mem_usage": True,
        }
        
        # Thêm token nếu có và cần thiết
        token_to_use = HF_TOKEN if (use_token and HF_TOKEN) else None
        if token_to_use:
            kwargs["token"] = token_to_use
            logger.info("Using HuggingFace token for authentication")
        
        # Sử dụng Whisper classes cụ thể thay vì Auto để tránh lỗi metadata
        try:
            kwargs["use_safetensors"] = True
            model = WhisperForConditionalGeneration.from_pretrained(model_id, **kwargs)
        except Exception as e1:
            logger.warning(f"Failed with safetensors, trying without: {e1}")
            kwargs.pop("use_safetensors", None)
            model = WhisperForConditionalGeneration.from_pretrained(model_id, **kwargs)
        
        model.to(DEVICE)
        processor = WhisperProcessor.from_pretrained(model_id, token=token_to_use)
        
        logger.info(f"✅ Successfully loaded: {model_id}")
        return model, processor
    except Exception as e:
        logger.warning(f"❌ Failed to load {model_id}: {e}")
        return None, None


def init_stt():
    """Initialize STT pipeline với fallback strategy"""
    global _pipe, _current_model
    
    # Thử các model theo thứ tự ưu tiên
    # PhoWhisper là public model nên thử không token trước
    models_to_try = [
        (PHOWHISPER_MODEL_ID, False),  # PhoWhisper không token (public)
        (PHOWHISPER_MODEL_ID, True),   # PhoWhisper với token (nếu cần)
        (WHISPER_FALLBACK_MODEL_ID, False),  # Whisper public
    ]
    
    for model_id, needs_token in models_to_try:
        model, processor = _try_load_model(model_id, needs_token)
        if model is not None and processor is not None:
            try:
                _pipe = pipeline(
                    "automatic-speech-recognition",
                    model=model,
                    tokenizer=processor.tokenizer,
                    feature_extractor=processor.feature_extractor,
                    max_new_tokens=128,
                    chunk_length_s=30,
                    batch_size=16,
                    return_timestamps=True,
                    torch_dtype=TORCH_DTYPE,
                    device=DEVICE,
                )
                _current_model = model_id
                logger.info(f"✅ STT initialized with: {model_id} on {DEVICE}")
                return True
            except Exception as e:
                logger.error(f"Failed to create pipeline for {model_id}: {e}")
                continue
    
    logger.error("❌ All STT models failed to load!")
    return False


def transcribe_audio(audio_path: str) -> str:
    """Transcribe audio file using STT pipeline"""
    global _pipe
    
    if _pipe is None:
        if not init_stt():
            logger.error("STT not available - all models failed")
            return ""
    
    try:
        logger.info(f"Transcribing {audio_path} using {_current_model}...")
        
        # Xác định language dựa trên model
        lang = "vi" if "phowhisper" in (_current_model or "").lower() else None
        generate_kwargs = {"language": lang} if lang else {}
        
        result = _pipe(audio_path, generate_kwargs=generate_kwargs)
        text = result.get("text", "").strip() if isinstance(result, dict) else str(result).strip()
        
        logger.info(f"Transcribed: {text[:50]}...")
        return text
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return ""
