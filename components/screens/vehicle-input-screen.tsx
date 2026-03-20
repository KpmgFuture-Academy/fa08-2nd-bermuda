"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Check, SkipForward, Sun, Lightbulb, ParkingCircle, Video, Wind, Key, Navigation, Flame, Snowflake, Armchair, Menu, X } from "lucide-react"

type Step =
  | "manufacturer" | "model" | "trim" | "year" | "displacement" | "fuel"
  | "transmission" | "vehicleClass" | "seats" | "color"
  | "mileage" | "accident" | "options"

interface VehicleInputScreenProps {
  onNext: (data: any) => void
  onBack?: () => void
  initialData?: any
  initialStep?: Step | null
}

const manufacturerModels: Record<string, string[]> = {
  "현대": [
    "그랜저", "쏘나타", "아반떼", "베뉴", "코나", "투싼", "싼타페", "팰리세이드",
    "스타리아", "엑센트", "i30", "i40", "스타렉스", "맥스크루즈", "베라크루즈",
    "벨로스터", "에쿠스", "캐스퍼", "제네시스 (구형)", "제네시스 쿠페"
  ],
  "기아": [
    "K3", "K5", "K7", "K8", "K9", "모닝", "레이", "셀토스", "스포티지",
    "쏘렌토", "카니발", "니로", "스팅어", "카렌스", "모하비", "프라이드"
  ],
  "제네시스": ["G80", "G90", "GV70", "GV80"],
  "쉐보레": [
    "스파크", "말리부", "크루즈", "트랙스", "트레일블레이저", "이쿼녹스",
    "트래버스", "콜로라도", "캡티바", "올란도", "아베오", "알페온", "임팔라"
  ],
  "르노코리아": ["SM3", "SM5", "SM6", "SM7", "QM3", "QM5", "QM6", "XM3", "그랑 콜레오스"],
  "쌍용/KG모빌리티": ["렉스턴", "렉스턴 스포츠", "코란도", "코란도 스포츠", "코란도 투리스모", "티볼리", "토레스"]
}

// 현재 예측 모델에서 지원하지 않는 모델 목록
const hiddenModels = ["G70", "넥쏘", "아이오닉", "아이오닉5", "EV6", "볼트"]

const trims: Record<string, string[]> = {
  "그랜저": ["프리미엄", "익스클루시브", "캘리그래피", "르블랑"],
  "쏘나타": ["스마트", "프리미엄", "인스퍼레이션", "N Line"],
  "아반떼": ["스마트", "모던", "프리미엄", "인스퍼레이션", "N", "N Line"],
  "K5": ["트렌디", "프레스티지", "노블레스", "시그니처", "GT"],
  "K8": ["트렌디", "프레스티지", "노블레스", "시그니처"],
  "싼타페": ["프리미엄", "익스클루시브", "캘리그래피", "프레스티지"],
  "쏘렌토": ["트렌디", "프레스티지", "노블레스", "시그니처", "그래비티"],
  "팰리세이드": ["프리미엄", "익스클루시브", "캘리그래피", "프레스티지"],
  "카니발": ["프레스티지", "노블레스", "시그니처", "하이리무진"],
  "default": ["베이직", "스마트", "프리미엄", "익스클루시브", "풀옵션"]
}

const fuels = ["가솔린", "디젤", "하이브리드", "LPG"]
const transmissions = ["자동", "수동", "CVT", "DCT"]
const colors = ["흰색", "검정", "회색", "은색", "빨강", "파랑", "네이비", "녹색", "노랑", "주황", "갈색", "베이지", "기타"]
const countOptions = ["없음", "1개", "2개", "3개", "4개", "5개 이상"]

type ModelMeta = {
  minYear: number
  maxYear: number
  vehicleClass: string
  seats: string[]
  displacements: string[]
}

const defaultMeta: ModelMeta = {
  minYear: 2000,
  maxYear: 2024,
  vehicleClass: "중형",
  seats: ["5인승"],
  displacements: ["1600", "2000", "2500"],
}

const modelMetaMap: Record<string, ModelMeta> = {
  "그랜저": { minYear: 2000, maxYear: 2024, vehicleClass: "준대형", seats: ["5인승"], displacements: ["2400", "2500", "3000", "3300"] },
  "쏘나타": { minYear: 2000, maxYear: 2024, vehicleClass: "중형", seats: ["5인승"], displacements: ["1600", "2000", "2500"] },
  "아반떼": { minYear: 2000, maxYear: 2024, vehicleClass: "준중형", seats: ["5인승"], displacements: ["1600", "2000"] },
  "베뉴": { minYear: 2019, maxYear: 2024, vehicleClass: "소형", seats: ["5인승"], displacements: ["1600"] },
  "코나": { minYear: 2017, maxYear: 2024, vehicleClass: "소형", seats: ["5인승"], displacements: ["1600", "2000"] },
  "투싼": { minYear: 2000, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1600", "2000"] },
  "싼타페": { minYear: 2000, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승", "6인승", "7인승"], displacements: ["2000", "2200", "2500"] },
  "팰리세이드": { minYear: 2018, maxYear: 2024, vehicleClass: "SUV", seats: ["7인승", "8인승"], displacements: ["2200", "3800"] },
  "스타리아": { minYear: 2021, maxYear: 2024, vehicleClass: "RV/MPV", seats: ["5인승", "7인승", "9인승 이상"], displacements: ["2200", "3500"] },
  "캐스퍼": { minYear: 2021, maxYear: 2024, vehicleClass: "경차", seats: ["4인승"], displacements: ["1000"] },
  "모닝": { minYear: 2000, maxYear: 2024, vehicleClass: "경차", seats: ["4인승", "5인승"], displacements: ["1000"] },
  "레이": { minYear: 2011, maxYear: 2024, vehicleClass: "경차", seats: ["4인승", "5인승"], displacements: ["1000"] },
  "K3": { minYear: 2012, maxYear: 2024, vehicleClass: "준중형", seats: ["5인승"], displacements: ["1600", "2000"] },
  "K5": { minYear: 2010, maxYear: 2024, vehicleClass: "중형", seats: ["5인승"], displacements: ["1600", "2000", "2500"] },
  "K7": { minYear: 2010, maxYear: 2021, vehicleClass: "준대형", seats: ["5인승"], displacements: ["2400", "2500", "3000", "3300"] },
  "K8": { minYear: 2021, maxYear: 2024, vehicleClass: "준대형", seats: ["5인승"], displacements: ["1600", "2500", "3500"] },
  "K9": { minYear: 2012, maxYear: 2024, vehicleClass: "대형", seats: ["5인승"], displacements: ["3300", "3800"] },
  "셀토스": { minYear: 2019, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1600", "2000"] },
  "스포티지": { minYear: 2000, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1600", "2000"] },
  "쏘렌토": { minYear: 2000, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승", "6인승", "7인승"], displacements: ["2200", "2500"] },
  "카니발": { minYear: 2000, maxYear: 2024, vehicleClass: "RV/MPV", seats: ["7인승", "9인승 이상"], displacements: ["2200", "3500"] },
  "니로": { minYear: 2016, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1600"] },
  "G80": { minYear: 2016, maxYear: 2024, vehicleClass: "대형", seats: ["5인승"], displacements: ["2500", "3000", "3500"] },
  "G90": { minYear: 2016, maxYear: 2024, vehicleClass: "대형", seats: ["5인승"], displacements: ["3300", "3500", "3800"] },
  "GV70": { minYear: 2020, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["2500", "3500"] },
  "GV80": { minYear: 2020, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승", "6인승", "7인승"], displacements: ["2500", "3000", "3500"] },
  "스파크": { minYear: 2000, maxYear: 2023, vehicleClass: "경차", seats: ["4인승", "5인승"], displacements: ["1000"] },
  "말리부": { minYear: 2011, maxYear: 2024, vehicleClass: "중형", seats: ["5인승"], displacements: ["1300", "1600", "2000"] },
  "트랙스": { minYear: 2013, maxYear: 2024, vehicleClass: "소형", seats: ["5인승"], displacements: ["1300", "1600"] },
  "트레일블레이저": { minYear: 2020, maxYear: 2024, vehicleClass: "소형", seats: ["5인승"], displacements: ["1300"] },
  "이쿼녹스": { minYear: 2018, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1600", "2000"] },
  "트래버스": { minYear: 2019, maxYear: 2024, vehicleClass: "SUV", seats: ["7인승", "8인승"], displacements: ["3600"] },
  "콜로라도": { minYear: 2019, maxYear: 2024, vehicleClass: "픽업트럭", seats: ["5인승"], displacements: ["2500", "3600"] },
  "SM6": { minYear: 2016, maxYear: 2024, vehicleClass: "중형", seats: ["5인승"], displacements: ["1300", "1600", "2000"] },
  "XM3": { minYear: 2020, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1300", "1600"] },
  "QM6": { minYear: 2016, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["2000"] },
  "그랑 콜레오스": { minYear: 2024, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1500", "2000"] },
  "티볼리": { minYear: 2015, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1600"] },
  "토레스": { minYear: 2022, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승"], displacements: ["1500"] },
  "렉스턴": { minYear: 2000, maxYear: 2024, vehicleClass: "SUV", seats: ["5인승", "7인승"], displacements: ["2200"] },
  "렉스턴 스포츠": { minYear: 2018, maxYear: 2024, vehicleClass: "픽업트럭", seats: ["5인승"], displacements: ["2200"] },
}

const optionsList = [
  { id: "sunroof", label: "선루프", icon: Sun },
  { id: "ledHeadlamp", label: "LED 헤드램프", icon: Lightbulb },
  { id: "parkingSensor", label: "주차감지센서", icon: ParkingCircle },
  { id: "rearCamera", label: "후방카메라", icon: Video },
  { id: "autoAC", label: "자동에어컨", icon: Wind },
  { id: "smartKey", label: "스마트키", icon: Key },
  { id: "navigation", label: "내비게이션", icon: Navigation },
  { id: "heatedSeat", label: "열선시트", icon: Flame },
  { id: "ventilatedSeat", label: "통풍시트", icon: Snowflake },
  { id: "leatherSeat", label: "가죽시트", icon: Armchair },
]


function getModelMeta(model: string): ModelMeta {
  return modelMetaMap[model] || defaultMeta
}

function getAvailableYears(model: string) {
  const meta = getModelMeta(model)
  const years = []
  for (let y = meta.maxYear; y >= meta.minYear; y--) {
    years.push(String(y))
  }
  return years
}

function getAvailableSeatOptions(model: string) {
  return getModelMeta(model).seats
}

function getAvailableDisplacements(model: string) {
  const values = getModelMeta(model).displacements
  return values.map((v) => ({ value: v, label: `${Number(v).toLocaleString()}cc` }))
}

const defaultFormData = {
  manufacturer: "",
  model: "",
  trim: "",
  year: "",
  displacement: "",
  fuel: "",
  transmission: "",
  vehicleClass: "",
  seats: "",
  color: "",
  mileage: "",
  accident: "",
  exchangeCount: "",
  paintCount: "",
  insuranceCount: "",
  corrosion: "",
  options: optionsList.map((option) => option.id) as string[]
}

export function VehicleInputScreen({ onNext, onBack, initialData, initialStep }: VehicleInputScreenProps) {
  const [step, setStep] = useState<Step>(initialStep || "manufacturer")
  const [formData, setFormData] = useState(initialData || defaultFormData)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (initialStep) {
      setStep(initialStep)
    }
  }, [initialStep])

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  useEffect(() => {
    if (!formData.model) return

    const meta = getModelMeta(formData.model)
    const availableYears = getAvailableYears(formData.model)
    const availableSeats = getAvailableSeatOptions(formData.model)
    const availableDisplacements = getAvailableDisplacements(formData.model)

    setFormData((prev: typeof defaultFormData) => ({
      ...prev,
      year: availableYears.includes(prev.year) ? prev.year : "",
      vehicleClass: meta.vehicleClass,
      seats: availableSeats.includes(prev.seats) ? prev.seats : "",
      displacement: availableDisplacements.some((d) => d.value === prev.displacement)
        ? prev.displacement
        : availableDisplacements[0]?.value || "",
      options: prev.options.length > 0 ? prev.options : optionsList.map((option) => option.id),
    }))
  }, [formData.model])

  const steps: Step[] = [
    "manufacturer", "model", "trim", "year", "displacement", "fuel",
    "transmission", "vehicleClass", "seats", "color",
    "mileage", "accident", "options"
  ]
  const currentStepIndex = steps.indexOf(step)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const stepInfo: Record<Step, { title: string; description: string }> = {
    manufacturer: { title: "제조사 선택", description: "차량의 제조사를 선택해주세요" },
    model: { title: "모델 선택", description: "차량 모델을 선택해주세요" },
    trim: { title: "트림 선택", description: "세부 트림을 선택해주세요" },
    year: { title: "연식 선택", description: "차량의 연식을 선택해주세요" },
    displacement: { title: "배기량 입력", description: "차량의 배기량을 입력해주세요" },
    fuel: { title: "연료 선택", description: "연료 종류를 선택해주세요" },
    transmission: { title: "변속기 선택", description: "변속기 종류를 선택해주세요" },
    vehicleClass: { title: "차급 선택", description: "차량의 차급을 선택해주세요" },
    seats: { title: "좌석수 선택", description: "좌석 수를 선택해주세요" },
    color: { title: "색상 선택", description: "외장 색상을 선택해주세요" },
    mileage: { title: "주행거리 입력", description: "현재 주행거리를 입력해주세요" },
    accident: { title: "차량 상태", description: "사고 이력과 차량 상태를 선택해주세요" },
    options: { title: "옵션 선택", description: "보유한 옵션을 선택해주세요" }
  }

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex])
    }
  }

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(steps[prevIndex])
    } else if (onBack) {
      onBack()
    }
  }

  const selectOption = (field: keyof typeof formData, value: string, autoNext = true) => {
    setFormData({ ...formData, [field]: value })
    if (autoNext) {
      setTimeout(goToNextStep, 200)
    }
  }

  const toggleOption = (optionId: string) => {
    const newOptions = formData.options.includes(optionId)
      ? formData.options.filter((id: string) => id !== optionId)
      : [...formData.options, optionId]
    setFormData({ ...formData, options: newOptions })
  }

  const getModelsForManufacturer = () => {
    const models = manufacturerModels[formData.manufacturer] || []
    return models.filter(model => !hiddenModels.includes(model))
  }
  const getTrimsForModel = () => trims[formData.model] || trims["default"]

  const isLastStep = step === "options"

  const SelectButton = ({
    selected,
    onClick,
    children,
    className = ""
  }: {
    selected: boolean
    onClick: () => void
    children: React.ReactNode
    className?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        h-14 px-4 rounded-2xl text-sm font-medium transition-all duration-200
        flex items-center justify-center gap-2
        ${selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-card border border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
        }
        ${className}
      `}
    >
      {children}
      {selected && <Check className="w-4 h-4 ml-1" />}
    </button>
  )

  const renderStepContent = () => {
    switch (step) {
      case "manufacturer":
        return (
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(manufacturerModels).map((manufacturer) => (
              <SelectButton
                key={manufacturer}
                selected={formData.manufacturer === manufacturer}
                onClick={() => {
                  setFormData({ ...formData, manufacturer, model: "", trim: "" })
                  setTimeout(goToNextStep, 200)
                }}
              >
                {manufacturer}
              </SelectButton>
            ))}
          </div>
        )

      case "model":
        return (
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {getModelsForManufacturer().map((model) => (
              <SelectButton
                key={model}
                selected={formData.model === model}
                onClick={() => {
                  setFormData({
                    ...formData,
                    model,
                    trim: "",
                    year: "",
                    displacement: "",
                    vehicleClass: "",
                    seats: "",
                  })
                  setTimeout(goToNextStep, 200)
                }}
              >
                {model}
              </SelectButton>
            ))}
          </div>
        )

      case "trim":
        return (
          <div className="space-y-3">
            <div className="space-y-3">
              {getTrimsForModel().map((trim) => (
                <SelectButton
                  key={trim}
                  selected={formData.trim === trim}
                  onClick={() => selectOption("trim", trim)}
                  className="w-full justify-between px-5"
                >
                  <span>{trim}</span>
                </SelectButton>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, trim: "" })
                goToNextStep()
              }}
              className="w-full h-12 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors rounded-xl border border-dashed border-border hover:border-primary/50"
            >
              <SkipForward className="w-4 h-4" />
              <span>잘 모르겠어요</span>
            </button>
          </div>
        )

      case "year":
        return (
          <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {getAvailableYears(formData.model).map((year) => (
              <SelectButton
                key={year}
                selected={formData.year === year}
                onClick={() => selectOption("year", year)}
              >
                {year}년
              </SelectButton>
            ))}
          </div>
        )

      case "displacement":
        return (
          <div className="space-y-5">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formData.displacement ? Number(formData.displacement).toLocaleString() : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setFormData({ ...formData, displacement: value })
                }}
                placeholder="배기량 직접 입력"
                className="w-full h-14 px-5 pr-14 bg-card border border-border rounded-2xl text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">cc</span>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">또는 대표값 선택</p>
              <div className="grid grid-cols-3 gap-2">
                {getAvailableDisplacements(formData.model).map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, displacement: preset.value })}
                    className={`h-11 px-3 text-sm rounded-xl transition-all ${formData.displacement === preset.value
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={goToNextStep}
              disabled={!formData.displacement}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl transition-all hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )

      case "fuel":
        return (
          <div className="grid grid-cols-2 gap-3">
            {fuels.map((fuel) => (
              <SelectButton
                key={fuel}
                selected={formData.fuel === fuel}
                onClick={() => selectOption("fuel", fuel)}
              >
                {fuel}
              </SelectButton>
            ))}
          </div>
        )

      case "transmission":
        return (
          <div className="grid grid-cols-2 gap-3">
            {transmissions.map((trans) => (
              <SelectButton
                key={trans}
                selected={formData.transmission === trans}
                onClick={() => selectOption("transmission", trans)}
              >
                {trans}
              </SelectButton>
            ))}
          </div>
        )

      case "vehicleClass":
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-2">선택한 모델 기준 차급</p>
              <p className="text-lg font-semibold text-foreground">{formData.vehicleClass}</p>
            </div>

            <button
              type="button"
              onClick={goToNextStep}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl transition-all hover:bg-primary/90"
            >
              다음
            </button>
          </div>
        )

      case "seats":
        return (
          <div className="grid grid-cols-2 gap-3">
            {getAvailableSeatOptions(formData.model).map((seat) => (
              <SelectButton
                key={seat}
                selected={formData.seats === seat}
                onClick={() => selectOption("seats", seat)}
              >
                {seat}
              </SelectButton>
            ))}
          </div>
        )

      case "color":
        return (
          <div className="grid grid-cols-3 gap-3">
            {colors.map((color) => (
              <SelectButton
                key={color}
                selected={formData.color === color}
                onClick={() => selectOption("color", color)}
              >
                {color}
              </SelectButton>
            ))}
          </div>
        )

      case "mileage":
        return (
          <div className="space-y-5">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formData.mileage ? Number(formData.mileage).toLocaleString() : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setFormData({ ...formData, mileage: value })
                }}
                placeholder="주행거리 입력"
                className="w-full h-14 px-5 pr-14 bg-card border border-border rounded-2xl text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">km</span>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">빠른 선택</p>
              <div className="flex flex-wrap gap-2">
                {["10,000", "30,000", "50,000", "80,000", "100,000", "150,000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, mileage: preset.replace(/,/g, "") })}
                    className={`px-4 py-2.5 text-sm rounded-xl transition-all ${formData.mileage === preset.replace(/,/g, "")
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    {preset}km
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={goToNextStep}
              disabled={!formData.mileage}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl transition-all hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )

      case "accident":
        return (
          <div className="space-y-4">
            {/* 사고 이력 선택 */}
            <div className="grid grid-cols-2 gap-3">
              <SelectButton
                selected={formData.accident === "무사고"}
                onClick={() => {
                  setFormData({
                    ...formData,
                    accident: "무사고",
                    exchangeCount: "",
                    paintCount: "",
                    insuranceCount: "0건",
                    corrosion: "없음"
                  })
                  setTimeout(goToNextStep, 200)
                }}
              >
                무사고
              </SelectButton>
              <SelectButton
                selected={formData.accident === "사고 이력 있음"}
                onClick={() => setFormData({ ...formData, accident: "사고 이력 있음" })}
              >
                사고 이력 있음
              </SelectButton>
            </div>

            {/* 사고 이력 상세 */}
            {formData.accident === "사고 이력 있음" && (
              <div className="mt-4 p-5 bg-card rounded-2xl border border-border space-y-5">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">교환 부위</p>
                  <div className="flex flex-wrap gap-2">
                    {countOptions.map((count) => (
                      <button
                        key={`exchange-${count}`}
                        type="button"
                        onClick={() => setFormData({ ...formData, exchangeCount: count })}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.exchangeCount === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">판금 부위</p>
                  <div className="flex flex-wrap gap-2">
                    {countOptions.map((count) => (
                      <button
                        key={`paint-${count}`}
                        type="button"
                        onClick={() => setFormData({ ...formData, paintCount: count })}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.paintCount === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">보험 이력</p>
                  <div className="flex flex-wrap gap-2">
                    {["0건", "1건", "2건", "3건", "4건", "5건 이상"].map((count) => (
                      <button
                        key={`insurance-${count}`}
                        type="button"
                        onClick={() => setFormData({ ...formData, insuranceCount: count })}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.insuranceCount === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">부식 여부</p>
                  <div className="flex flex-wrap gap-2">
                    {["없음", "경미", "심함"].map((option) => (
                      <button
                        key={`corrosion-${option}`}
                        type="button"
                        onClick={() => setFormData({ ...formData, corrosion: option })}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.corrosion === option
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!formData.exchangeCount || !formData.paintCount || !formData.insuranceCount || !formData.corrosion}
                  className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl transition-all hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )

      case "options":
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground px-1">기본값으로 주요 옵션이 모두 선택되어 있어요. 없는 옵션만 해제해주세요.</p>
            <div className="grid grid-cols-2 gap-3">
              {optionsList.map((option) => {
                const isSelected = formData.options.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={`h-16 px-4 rounded-2xl text-sm font-medium transition-all flex items-center gap-3 ${isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                      }`}
                  >
                    <option.icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1 text-left">{option.label}</span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, options: optionsList.map((option) => option.id) })}
              className="w-full h-12 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors rounded-xl border border-dashed border-border hover:border-primary/50"
            >
              옵션 전체 다시 선택
            </button>
            <button
              type="button"
              onClick={goToPrevStep}
              className="w-full mt-4 h-12 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-2xl border border-border hover:border-foreground/30 bg-card"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전 단계로</span>
            </button>
          </div>
        )
    }
  }

  const summaryTags = [
    formData.manufacturer,
    formData.model,
    formData.trim,
    formData.year && `${formData.year}년`,
    formData.displacement && `${Number(formData.displacement).toLocaleString()}cc`,
    formData.fuel,
    formData.transmission,
    formData.vehicleClass,
    formData.seats,
    formData.color,
    formData.mileage && `${Number(formData.mileage).toLocaleString()}km`,
    formData.accident,
    formData.options.length > 0 && `옵션 ${formData.options.length}개`
  ].filter(Boolean)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button
            className="p-2 -ml-2 text-foreground disabled:text-muted-foreground/50 transition-colors"
            aria-label="뒤로가기"
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0 && !onBack}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="screen-section-title flex-1 text-center text-foreground">내 차 시세 조회</h1>
          <button
            className="p-2 -mr-2 text-foreground transition-colors"
            aria-label="단계 목록"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Step Navigation Menu */}
        {isMenuOpen && (
          <div className="absolute top-14 right-4 w-56 bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-20">
            <div className="py-2 max-h-80 overflow-y-auto">
              {steps.map((s, index) => {
                const isCompleted = index < currentStepIndex
                const isCurrent = index === currentStepIndex
                const isAccessible = index <= currentStepIndex
                
                return (
                  <button
                    key={s}
                    disabled={!isAccessible}
                    onClick={() => {
                      if (isAccessible) {
                        setStep(s)
                        setIsMenuOpen(false)
                      }
                    }}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                      isCurrent
                        ? "bg-primary/10"
                        : isAccessible
                        ? "hover:bg-muted/50"
                        : ""
                    } ${!isAccessible ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold shrink-0 ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        isCurrent
                          ? "font-semibold text-primary"
                          : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {stepInfo[s].title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Menu Backdrop */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Progress */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">
              <span className="text-primary font-semibold">{currentStepIndex + 1}</span>
              <span className="mx-1">/</span>
              <span>{steps.length}</span>
            </span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="p-5">
          {/* Step Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">{stepInfo[step].title}</h2>
            <p className="text-sm text-muted-foreground">{stepInfo[step].description}</p>
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Bottom Back Button */}
          {currentStepIndex > 0 && !isLastStep && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="w-full mt-6 h-12 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-2xl border border-border hover:border-foreground/30 bg-card"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>이전 단계로</span>
            </button>
          )}
        </div>
      </main>

      {/* Bottom Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        {/* Summary Tags */}
        {summaryTags.length > 0 && !isLastStep && (
          <div className="px-4 pt-3 pb-2">
            <p className="text-xs text-muted-foreground mb-2">선택한 정보</p>
            <div className="flex flex-wrap gap-1.5">
              {summaryTags.slice(0, 5).map((tag, i) => (
                <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-lg font-medium">
                  {tag}
                </span>
              ))}
              {summaryTags.length > 5 && (
                <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs rounded-lg">
                  +{summaryTags.length - 5}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA Button - Only for last step */}
        {isLastStep && (
          <div className="p-4">
            <button
              type="button"
              onClick={() => onNext(formData)}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold rounded-2xl transition-all hover:bg-primary/90 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <span>시세 조회하기</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
