from pathlib import Path
import json
import os
import pickle
import re
from functools import lru_cache
from typing import List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

from preprocess import build_model_input

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
MODEL_PATHS = [
    BASE_DIR / "models" / "xgb_quantile_kfte_tuned_models.pkl",
    BASE_DIR / "models" / "xgb_quantile_models.pkl",
]
FEATURE_PATHS = [
    BASE_DIR / "models" / "kfte_feature_columns.pkl",
    BASE_DIR / "models" / "model_features.pkl",
]
ENCODING_PATH = BASE_DIR / "models" / "kfte_encoding_map.pkl"


def load_env_file():
    env_paths = [
        PROJECT_DIR / ".env.local",
        PROJECT_DIR / ".env",
        BASE_DIR / ".env.local",
        BASE_DIR / ".env",
    ]

    for env_path in env_paths:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            if key and key not in os.environ:
                os.environ[key] = value


load_env_file()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    manufacturer: str
    model: str
    trim: str = ""
    year: str
    displacement: str
    fuel: str
    transmission: str
    vehicleClass: str
    seats: str
    color: str
    mileage: str
    accident: str
    exchangeCount: str = "없음"
    paintCount: str = "없음"
    insuranceCount: str = "없음"
    corrosion: str = "없음"
    options: list[str] = []


class ExplainPriceRequest(BaseModel):
    manufacturer: str
    model: str
    trim: str = ""
    year: str
    displacement: str
    fuel: str
    transmission: str
    vehicleClass: str
    seats: str
    color: str
    mileage: str
    accident: str
    exchangeCount: str = "없음"
    paintCount: str = "없음"
    insuranceCount: str = "없음"
    corrosion: str = "없음"
    options: list[str] = []
    fastPrice: float
    fairPrice: float
    highPrice: float


def resolve_existing_path(paths: list[Path]) -> Path:
    for path in paths:
        if path.exists():
            return path
    raise FileNotFoundError(f"아티팩트를 찾을 수 없습니다: {paths}")


@lru_cache(maxsize=1)
def load_artifacts():
    model_path = resolve_existing_path(MODEL_PATHS)
    feature_path = resolve_existing_path(FEATURE_PATHS)

    with open(model_path, "rb") as model_file:
        models = pickle.load(model_file)

    with open(feature_path, "rb") as feature_file:
        model_features = pickle.load(feature_file)

    model_encoding_map = {}
    if ENCODING_PATH.exists():
        with open(ENCODING_PATH, "rb") as encoding_file:
            model_encoding_map = pickle.load(encoding_file)

    return models, model_features, model_encoding_map


def get_quantile_model(models, quantile: float):
    if isinstance(models, dict):
        for candidate in (quantile, str(quantile)):
            if candidate in models:
                return models[candidate]

        for key, model in models.items():
            try:
                if abs(float(key) - quantile) < 1e-9:
                    return model
            except (TypeError, ValueError):
                continue

        raise KeyError(f"해당 분위수 모델을 찾을 수 없습니다: {quantile}")

    if isinstance(models, (list, tuple)) and len(models) >= 3:
        if quantile <= 0.05:
            return models[0]
        if quantile >= 0.95:
            return models[-1]
        return models[len(models) // 2]

    raise TypeError("지원하지 않는 모델 아티팩트 형식입니다.")


def decode_prediction(raw_prediction: float) -> float:
    return float(np.expm1(raw_prediction)) if raw_prediction < 20 else float(raw_prediction)


def get_base_margin(row: dict) -> Optional[List[float]]:
    if "모델_encoded" not in row:
        return None
    return [float(row["모델_encoded"])]


def get_margin_rate(q50: float) -> float:
    if q50 < 1500:
        return 0.08
    if q50 < 3000:
        return 0.07
    if q50 < 5000:
        return 0.06
    return 0.05


def get_fixed_cost() -> int:
    return 25


def get_fast_discount(q50: float) -> int:
    return int(min(max(q50 * 0.01, 15), 40))


def get_trust_discount(q50: float) -> int:
    return int(min(max(q50 * 0.005, 10), 30))


def adjust_to_c2c_prices(q05: float, q50: float, q95: float):
    fixed_cost = get_fixed_cost()
    margin_rate = get_margin_rate(q50)
    fast_discount = get_fast_discount(q50)
    trust_discount = get_trust_discount(q50)

    dealer_component = q50 * margin_rate

    fair_price = q50 - ((fixed_cost + dealer_component) / 2)
    fast_formula = q50 - (fixed_cost + dealer_component) - fast_discount
    high_formula = q50 - trust_discount

    fast_price = min(q05, fast_formula)
    high_price = min(q95, high_formula)

    fast_price = max(fast_price, 0)
    fair_price = max(fair_price, 0)
    high_price = max(high_price, 0)

    if fast_price > fair_price:
        fast_price = max(fair_price - 10, 0)

    if high_price < fair_price:
        high_price = fair_price

    return {
        "fast": round(fast_price, 0),
        "fair": round(fair_price, 0),
        "high": round(high_price, 0),
        "fixedCost": fixed_cost,
        "marginRate": round(margin_rate, 4),
        "fastDiscount": fast_discount,
        "trustDiscount": trust_discount,
    }


def parse_openai_json(text: str) -> dict:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def generate_price_explanation(
    form_data: dict, fast_price: float, fair_price: float, high_price: float
) -> dict:
    default_result = {
        "summary": "입력한 차량 조건을 바탕으로 예상 판매 가격대를 계산했습니다.",
        "detail": "연식, 주행거리, 사고 이력, 옵션 수를 함께 반영해 가격 범위를 구성했습니다.",
        "tip": "빠르게 판매하려면 빠른 판매가를, 여유가 있다면 적정 판매가부터 시작해 보세요.",
        "source": "fallback",
        "debug": {
            "openai_enabled": bool(openai_client),
            "reason": "fallback_default",
        },
    }

    if not openai_client:
        result = default_result.copy()
        result["debug"] = {
            "openai_enabled": False,
            "reason": "missing_openai_api_key",
        }
        return result

    accident_text = (
        "사고 이력 있음"
        if str(form_data.get("accident", "")).strip() == "사고 이력 있음"
        else "무사고"
    )
    option_count = len(form_data.get("options", []))

    prompt = f"""
다음 중고차 가격 예측 결과를 바탕으로 JSON 객체만 출력해 주세요. 마크다운 코드블록(```)은 절대 사용하지 마세요.

출력 형식:
{{
  "summary": "가격 형성 핵심 이유를 한 문장으로 요약",
  "detail": "3문장 설명",
  "tip": "판매 팁 한 문장"
}}

작성 규칙:
- summary는 차량 정보 나열이 아니라, 왜 이 가격대가 형성되었는지 핵심 이유를 한 줄로 요약할 것
- 연식, 주행거리, 사고 여부, 옵션 수준, 차량 상태 중 실제 가격에 가장 큰 영향을 준 요소를 우선 반영할 것
- "2020년식 K5입니다"처럼 단순 차량 소개로 시작하지 말 것
- detail은 summary를 풀어 설명하되, 입력값을 자연스럽게 근거로 연결할 것
- tip은 판매자가 바로 활용할 수 있는 가격 전략 또는 강조 포인트로 작성할 것
- 전체 말투는 딱딱한 보고서체보다, 직거래 서비스에서 안내해주는 것처럼 부드럽고 자연스럽게 쓸 것
- 과한 홍보 문구나 과장 표현 없이, 친근하지만 신뢰감 있는 한국어로 작성할 것
- 문장은 짧고 읽기 쉽게 쓰고, 사용자가 바로 이해할 수 있는 표현을 사용할 것

차량 정보:
- 제조사: {form_data.get("manufacturer")}
- 모델: {form_data.get("model")}
- 트림: {form_data.get("trim")}
- 연식: {form_data.get("year")}
- 배기량: {form_data.get("displacement")}cc
- 연료: {form_data.get("fuel")}
- 변속기: {form_data.get("transmission")}
- 차종: {form_data.get("vehicleClass")}
- 좌석 수: {form_data.get("seats")}
- 색상: {form_data.get("color")}
- 주행거리: {form_data.get("mileage")}km
- 사고 여부: {accident_text}
- 교환 부위 수: {form_data.get("exchangeCount")}
- 판금 부위 수: {form_data.get("paintCount")}
- 보험 이력: {form_data.get("insuranceCount")}
- 부식 여부: {form_data.get("corrosion")}
- 주요 옵션 수: {option_count}

예측 결과:
- 빠른 판매가: {round(fast_price)}만원
- 적정 판매가: {round(fair_price)}만원
- 기대 판매가: {round(high_price)}만원
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            response_format={"type": "json_object"},
            timeout=25.0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 중고차 판매가 설명을 작성하는 도우미입니다. "
                        "반드시 유효한 JSON 객체만 출력하세요. "
                        "마크다운 코드블록, 설명 문장, 머리말, 꼬리말을 절대 추가하지 마세요. "
                        "제공된 차량 정보만 사용하고, 입력에 없는 사실은 추측하지 마세요. "
                        "특히 사고 여부는 입력값을 그대로 반영하세요. "
                        "summary는 차량 소개가 아니라 가격이 이렇게 형성된 핵심 이유를 한 줄로 요약해야 합니다. "
                        "가장 영향력이 큰 요인을 먼저 언급하고, 단순히 제조사·모델·연식만 반복하지 마세요. "
                        "말투는 직거래 서비스 안내 문구처럼 부드럽고 자연스럽게, 너무 딱딱하지 않게 작성하세요. "
                        "다만 과장되거나 가벼워 보이지 않도록, 친근하지만 신뢰감 있는 한국어를 사용하세요."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            max_tokens=300,
            temperature=0.3,
        )

        raw_content = response.choices[0].message.content or "{}"
        result = parse_openai_json(raw_content)
        return {
            "summary": result.get("summary", default_result["summary"]),
            "detail": result.get("detail", default_result["detail"]),
            "tip": result.get("tip", default_result["tip"]),
            "source": "openai",
            "debug": {
                "openai_enabled": True,
                "reason": "success",
            },
        }
    except Exception as exc:
        result = default_result.copy()
        result["debug"] = {
            "openai_enabled": bool(openai_client),
            "reason": f"{type(exc).__name__}: {str(exc)[:260]}",
        }
        return result

@app.get("/")
def root():
    return {"message": "backend is running"}

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/openai-health")
def openai_health():
    return {
        "openai_api_key_loaded": bool(OPENAI_API_KEY),
        "openai_client_initialized": bool(openai_client),
    }


@app.post("/predict")
def predict(req: PredictRequest):
    if req.fuel == "전기":
        raise HTTPException(status_code=400, detail="현재 전기차는 지원하지 않습니다.")

    try:
        models, model_features, model_encoding_map = load_artifacts()
        form_data = req.model_dump()

        row = build_model_input(form_data, model_features, model_encoding_map)
        x_input = pd.DataFrame([[row[col] for col in model_features]], columns=model_features)
        base_margin = get_base_margin(row)

        pred_fast = decode_prediction(
            get_quantile_model(models, 0.05).predict(x_input, base_margin=base_margin)[0]
        )
        pred_mid = decode_prediction(
            get_quantile_model(models, 0.5).predict(x_input, base_margin=base_margin)[0]
        )
        pred_high = decode_prediction(
            get_quantile_model(models, 0.95).predict(x_input, base_margin=base_margin)[0]
        )

        q05, q50, q95 = sorted([pred_fast, pred_mid, pred_high])
        adjusted = adjust_to_c2c_prices(q05, q50, q95)

        return {
            "fastPrice": adjusted["fast"],
            "fairPrice": adjusted["fair"],
            "highPrice": adjusted["high"],
            "pricingMeta": {
                "fixedCost": adjusted["fixedCost"],
                "marginRate": adjusted["marginRate"],
                "fastDiscount": adjusted["fastDiscount"],
                "trustDiscount": adjusted["trustDiscount"],
                "baseQ50": round(q50, 0),
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/explain-price")
def explain_price(req: ExplainPriceRequest):
    try:
        form_data = req.model_dump()
        explanation = generate_price_explanation(
            form_data=form_data,
            fast_price=req.fastPrice,
            fair_price=req.fairPrice,
            high_price=req.highPrice,
        )
        return {"explanation": explanation}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
