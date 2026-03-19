from pathlib import Path
import json
import os
import pickle

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

from preprocess import build_model_input

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "xgb_quantile_models.pkl"
FEATURE_PATH = BASE_DIR / "models" / "model_features.pkl"

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


def load_artifacts():
    with open(MODEL_PATH, "rb") as model_file:
        models = pickle.load(model_file)

    with open(FEATURE_PATH, "rb") as feature_file:
        model_features = pickle.load(feature_file)

    return models, model_features


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


def generate_price_explanation(
    form_data: dict, fast_price: float, fair_price: float, high_price: float
) -> dict:
    default_result = {
        "summary": "입력한 차량 조건을 바탕으로 예상 판매 가격대를 계산했습니다.",
        "detail": "연식, 주행거리, 사고 이력, 옵션 수를 함께 반영해 가격 범위를 구성했습니다.",
        "tip": "빠르게 판매하려면 빠른 판매가를, 여유가 있다면 적정 판매가부터 시작해 보세요.",
    }

    if not openai_client:
        return default_result

    accident_text = (
        "사고 이력 있음"
        if "사고" in str(form_data.get("accident", ""))
        else "무사고"
    )
    option_count = len(form_data.get("options", []))

    prompt = f"""
다음 중고차 가격 예측 결과를 바탕으로 JSON만 출력해 주세요.

출력 형식:
{{
  "summary": "한 문장 요약",
  "detail": "2~3문장 설명",
  "tip": "판매 팁 한 문장"
}}

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
        response = openai_client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "system",
                    "content": "당신은 중고차 판매가 설명을 작성하는 도우미입니다. 반드시 JSON만 출력하세요.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            max_output_tokens=300,
        )

        result = json.loads(response.output_text.strip())
        return {
            "summary": result.get("summary", default_result["summary"]),
            "detail": result.get("detail", default_result["detail"]),
            "tip": result.get("tip", default_result["tip"]),
        }
    except Exception:
        return default_result

@app.get("/")
def root():
    return {"message": "backend is running"}

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(req: PredictRequest):
    if req.fuel == "전기":
        raise HTTPException(status_code=400, detail="현재 전기차는 지원하지 않습니다.")

    try:
        models, model_features = load_artifacts()
        form_data = req.model_dump()

        row = build_model_input(form_data, model_features)
        x_input = pd.DataFrame([[row[col] for col in model_features]], columns=model_features)

        pred_fast = float(np.expm1(models[0.05].predict(x_input)[0]))
        pred_mid = float(np.expm1(models[0.5].predict(x_input)[0]))
        pred_high = float(np.expm1(models[0.95].predict(x_input)[0]))

        q05, q50, q95 = sorted([pred_fast, pred_mid, pred_high])
        adjusted = adjust_to_c2c_prices(q05, q50, q95)

        explanation = generate_price_explanation(
            form_data=form_data,
            fast_price=adjusted["fast"],
            fair_price=adjusted["fair"],
            high_price=adjusted["high"],
        )

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
            "explanation": explanation,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
