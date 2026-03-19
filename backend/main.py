from pathlib import Path
import pickle
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from preprocess import build_model_input

import os
from openai import OpenAI

import json

BASE_DIR = Path(__file__).resolve().parent
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
MODEL_PATH = BASE_DIR / "models" / "xgb_quantile_models.pkl"
FEATURE_PATH = BASE_DIR / "models" / "model_features.pkl"

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
    with open(MODEL_PATH, "rb") as f:
        models = pickle.load(f)

    with open(FEATURE_PATH, "rb") as f:
        model_features = pickle.load(f)

    return models, model_features

def generate_price_explanation(form_data: dict, fast_price: float, fair_price: float, high_price: float) -> dict:
    default_result = {
        "summary": "입력한 차량 조건을 바탕으로 가격을 계산했어요.",
        "detail": "연식, 주행거리, 사고 여부, 옵션 수준을 함께 반영한 결과예요.",
        "tip": "빠르게 판매하려면 빠른 판매가에 가깝게, 여유가 있다면 적정 판매가 또는 최대 수익가 전략을 고려해보세요."
    }

    if not openai_client:
        return default_result

    option_count = len(form_data.get("options", []))
    accident_text = "사고 이력 있음" if form_data.get("accident") == "사고 이력 있음" else "무사고"

    prompt = f"""
다음 중고차 가격 예측 결과를 바탕으로 JSON만 출력해줘.
설명은 한국어로 작성하고, 사용자가 이해하기 쉽게 짧고 명확하게 써줘.

반드시 아래 JSON 형식만 출력:
{{
  "summary": "한 줄 요약",
  "detail": "왜 이런 가격이 나왔는지 2~3문장 설명",
  "tip": "판매 전략 팁 1문장"
}}

조건:
- summary는 1문장
- detail은 2~3문장
- tip은 1문장
- 너무 기술적으로 쓰지 말 것
- 과장된 표현 금지
- 차량 상태와 시세를 반영한 자연스러운 설명
- JSON 외 다른 문장 출력 금지

차량 정보:
- 제조사: {form_data.get("manufacturer")}
- 모델: {form_data.get("model")}
- 트림: {form_data.get("trim")}
- 연식: {form_data.get("year")}
- 배기량: {form_data.get("displacement")}cc
- 연료: {form_data.get("fuel")}
- 변속기: {form_data.get("transmission")}
- 차급: {form_data.get("vehicleClass")}
- 좌석수: {form_data.get("seats")}
- 색상: {form_data.get("color")}
- 주행거리: {form_data.get("mileage")}km
- 사고 여부: {accident_text}
- 교환 부위 개수: {form_data.get("exchangeCount")}
- 판금 부위 개수: {form_data.get("paintCount")}
- 보험 이력: {form_data.get("insuranceCount")}
- 부식 여부: {form_data.get("corrosion")}
- 주요 옵션 개수: {option_count}개

예측 가격:
- 빠른 판매가: {round(fast_price)}만원
- 적정 판매가: {round(fair_price)}만원
- 최대 수익가: {round(high_price)}만원
"""

    try:
        response = openai_client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "system",
                    "content": "너는 중고차 판매가격을 해석하는 서비스 설명 도우미다. 반드시 JSON만 출력한다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_output_tokens=300,
        )

        text = response.output_text.strip()
        result = json.loads(text)

        return {
            "summary": result.get("summary", default_result["summary"]),
            "detail": result.get("detail", default_result["detail"]),
            "tip": result.get("tip", default_result["tip"]),
        }

    except Exception:
        return default_result

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
        X_input = pd.DataFrame([[row[col] for col in model_features]], columns=model_features)

        pred_fast = float(np.expm1(models[0.05].predict(X_input)[0]))
        pred_mid = float(np.expm1(models[0.5].predict(X_input)[0]))
        pred_high = float(np.expm1(models[0.95].predict(X_input)[0]))

        preds = sorted([pred_fast, pred_mid, pred_high])

        explanation = generate_price_explanation(
            form_data=form_data,
            fast_price=preds[0],
            fair_price=preds[1],
            high_price=preds[2],
        )

        return {
            "fastPrice": round(preds[0], 0),
            "fairPrice": round(preds[1], 0),
            "highPrice": round(preds[2], 0),
            "explanation": explanation,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))