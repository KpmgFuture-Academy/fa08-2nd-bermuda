import math
from typing import Optional

BASE_YEAR = 2024
DEFAULT_MODEL_ENCODING = 7.2

manufacturer_label_map = {
    "쌍용/KG모빌리티": 0,
    "기아": 1,
    "르노코리아": 2,
    "쉐보레": 3,
    "제네시스": 4,
    "현대": 5,
}

fuel_label_map = {
    "LPG": 0,
    "가솔린": 1,
    "디젤": 2,
    "수소": 3,
    "하이브리드": 5,
}

option_feature_map = {
    "sunroof": "주요옵션_선루프",
    "ledHeadlamp": "주요옵션_헤드램프 (LED)",
    "parkingSensor": "주요옵션_주차감지센서",
    "rearCamera": "주요옵션_후방카메라",
    "autoAC": "주요옵션_자동에어컨",
    "smartKey": "주요옵션_스마트키",
    "navigation": "주요옵션_내비게이션",
    "heatedSeat": "주요옵션_열선시트",
    "ventilatedSeat": "주요옵션_통풍시트",
    "leatherSeat": "주요옵션_가죽시트",
}

manufacturer_feature_map = {
    "현대": "제조사_현대",
    "기아": "제조사_기아",
    "제네시스": "제조사_제네시스",
    "쌍용/KG모빌리티": "제조사_KG모빌리티(쌍용)",
    "쉐보레": "제조사_쉐보레(GM대우)",
    "르노코리아": "제조사_르노코리아(삼성)",
}

fuel_feature_map = {
    "LPG": "연료_LPG",
    "가솔린": "연료_가솔린",
    "디젤": "연료_디젤",
    "수소": "연료_수소",
    "하이브리드": "연료_하이브리드",
}

seat_map = {
    "2인승": 2,
    "4인승": 4,
    "5인승": 5,
    "6인승": 6,
    "7인승": 7,
    "8인승": 8,
    "9인승 이상": 9,
}

count_map = {
    "없음": 0,
    "1개": 1,
    "2개": 2,
    "3개": 3,
    "4개": 4,
    "5개 이상": 5,
    "0건": 0,
    "1건": 1,
    "2건": 2,
    "3건": 3,
    "4건": 4,
    "5건 이상": 5,
}


def map_color_label(color: str) -> int:
    if color == "검정":
        return 0
    if color == "흰색":
        return 3
    if color in ["은색", "회색"]:
        return 2
    return 1


def map_transmission_label(transmission: str) -> int:
    if transmission in ["자동", "CVT", "DCT"]:
        return 1
    return 0


def map_vehicle_class_label(vehicle_class: str) -> int:
    if vehicle_class in ["SUV", "RV/MPV", "픽업트럭"]:
        return 0
    return 1


def map_seats(seats: str) -> int:
    return seat_map.get(seats, 5)


def map_count(value: str) -> int:
    return count_map.get(value, 0)


def safe_int(value, default=0):
    try:
        return int(str(value).replace(",", "").strip())
    except Exception:
        return default


def normalize_color_feature(color: str) -> str:
    if color == "흰색":
        return "색상_흰색"
    if color == "검정":
        return "색상_검정색"
    if color in ["은색", "회색"]:
        return "색상_은색"
    return "색상_기타"


def set_if_present(row: dict, feature_name: str, value):
    if feature_name in row:
        row[feature_name] = value


def build_model_input(
    form_data: dict, model_features: list, model_encoding_map: Optional[dict] = None
) -> dict:
    row = {feature: 0 for feature in model_features}

    year = safe_int(form_data.get("year"), BASE_YEAR)
    displacement = safe_int(form_data.get("displacement"), 1600)
    mileage = safe_int(form_data.get("mileage"), 0)

    vehicle_age = max(BASE_YEAR - year, 0)
    annual_mileage = mileage / (vehicle_age + 1)

    accident_flag = form_data.get("accident") == "사고 이력 있음"
    exchange_count = map_count(form_data.get("exchangeCount", "없음")) if accident_flag else 0
    paint_count = map_count(form_data.get("paintCount", "없음")) if accident_flag else 0
    insurance_count = map_count(form_data.get("insuranceCount", "없음")) if accident_flag else 0
    corrosion_flag = (
        1 if accident_flag and form_data.get("corrosion", "없음") != "없음" else 0
    )

    accident_score = exchange_count * 2 + paint_count + insurance_count + corrosion_flag

    set_if_present(row, "좌석수", map_seats(form_data.get("seats", "5인승")))
    set_if_present(row, "사고강도점수", accident_score)

    set_if_present(
        row,
        "제조사_라벨",
        manufacturer_label_map.get(form_data.get("manufacturer"), 0),
    )
    set_if_present(row, "연료_라벨", fuel_label_map.get(form_data.get("fuel"), 1))
    set_if_present(row, "색상_라벨", map_color_label(form_data.get("color", "기타")))
    set_if_present(
        row,
        "변속기_라벨",
        map_transmission_label(form_data.get("transmission", "자동")),
    )
    set_if_present(
        row,
        "차급_라벨",
        map_vehicle_class_label(form_data.get("vehicleClass", "중형")),
    )

    set_if_present(row, "주행거리_km_log", math.log1p(mileage))
    set_if_present(row, "배기량_cc_log", math.log1p(displacement))
    set_if_present(row, "연간_주행거리_log", math.log1p(annual_mileage))
    set_if_present(row, "차량연령_log", math.log1p(vehicle_age))

    for option in form_data.get("options", []):
        feature_name = option_feature_map.get(option)
        if feature_name:
            set_if_present(row, feature_name, 1)

    legacy_model_col = f"모델_{form_data.get('model', '')}"
    set_if_present(row, legacy_model_col, 1)

    manufacturer_feature = manufacturer_feature_map.get(form_data.get("manufacturer", ""))
    if manufacturer_feature:
        set_if_present(row, manufacturer_feature, 1)

    fuel_feature = fuel_feature_map.get(form_data.get("fuel", ""))
    if fuel_feature:
        set_if_present(row, fuel_feature, 1)

    set_if_present(row, normalize_color_feature(form_data.get("color", "기타")), 1)

    set_if_present(
        row,
        "변속기_오토계열",
        1 if form_data.get("transmission") in ["자동", "CVT", "DCT"] else 0,
    )

    vehicle_class = form_data.get("vehicleClass", "")
    if vehicle_class in ["SUV", "RV/MPV", "픽업트럭"]:
        set_if_present(row, "차급_SUV계열", 1)
    elif vehicle_class:
        set_if_present(row, "차급_세단계열", 1)

    if "모델_encoded" in row:
        encoding_map = model_encoding_map or {}
        default_encoding = (
            sum(encoding_map.values()) / len(encoding_map)
            if encoding_map
            else DEFAULT_MODEL_ENCODING
        )
        row["모델_encoded"] = float(
            encoding_map.get(form_data.get("model"), default_encoding)
        )

    return row
