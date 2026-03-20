"use client"

import { useEffect, useState } from "react"
import { PriceResultScreen } from "@/components/screens/price-result-screen"
import { SummaryScreen } from "@/components/screens/summary-screen"
import { VehicleInputScreen } from "@/components/screens/vehicle-input-screen"
import { WelcomeScreen } from "@/components/screens/welcome-screen"

type VehicleFormData = {
  manufacturer: string
  model: string
  trim: string
  year: string
  displacement: string
  fuel: string
  transmission: string
  vehicleClass: string
  seats: string
  color: string
  mileage: string
  accident: string
  exchangeCount: string
  paintCount: string
  insuranceCount: string
  corrosion: string
  options: string[]
}

type PredictionData = {
  fastPrice: number
  fairPrice: number
  highPrice: number
  pricingMeta?: {
    fixedCost: number
    marginRate: number
    fastDiscount: number
    trustDiscount: number
    baseQ50: number
  }
  explanation: {
    summary: string
    detail: string
    tip: string
    source?: string
  }
}

const initialVehicleData: VehicleFormData = {
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
  options: [],
}

type Step =
  | "manufacturer"
  | "model"
  | "trim"
  | "year"
  | "displacement"
  | "fuel"
  | "transmission"
  | "vehicleClass"
  | "seats"
  | "color"
  | "mileage"
  | "accident"
  | "options"

type EditSection = "basic" | "status" | "accident" | "options"

const sectionToStep: Record<EditSection, Step> = {
  basic: "manufacturer",
  status: "mileage",
  accident: "accident",
  options: "options",
}

function createMockPrediction(vehicleData: VehicleFormData): PredictionData {
  const currentYear = new Date().getFullYear()
  const age = vehicleData.year ? currentYear - Number(vehicleData.year) : 5
  const mileage = Number(String(vehicleData.mileage).replace(/,/g, "")) || 50000
  const optionCount = Array.isArray(vehicleData.options) ? vehicleData.options.length : 0
  const hasAccident = vehicleData.accident.includes("사고")

  const basePrice = Math.max(500, 3200 - age * 180 - (mileage / 10000) * 45)
  const accidentFactor = hasAccident ? 0.86 : 1
  const optionBonus = optionCount * 12

  const fairPrice = Math.round((basePrice * accidentFactor + optionBonus) / 10) * 10
  const fastPrice = Math.round((fairPrice * 0.93) / 10) * 10
  const highPrice = Math.round((fairPrice * 1.08) / 10) * 10

  return {
    fastPrice,
    fairPrice,
    highPrice,
    explanation: {
      summary: "입력한 차량 조건을 바탕으로 예상 판매 가격대를 계산했어요.",
      detail:
        "연식, 주행거리, 사고 이력, 옵션 수를 함께 반영해 빠른 판매가와 적정 판매가, 기대 판매가를 구성했습니다.",
      tip: "급하게 판매해야 한다면 빠른 판매가를, 여유가 있다면 적정 판매가부터 시작해 보세요.",
    },
  }
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<0 | 1 | 2 | 3>(0)
  const [vehicleData, setVehicleData] = useState<VehicleFormData>(initialVehicleData)
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editStep, setEditStep] = useState<Step | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentScreen])

  const handleVehicleNext = (data: VehicleFormData) => {
    setVehicleData(data)
    setEditStep(null)
    setCurrentScreen(2)
  }

  const handleEdit = (section: EditSection) => {
    setEditStep(sectionToStep[section])
    setCurrentScreen(1)
  }

  const handleSummaryNext = async () => {
    try {
      setIsLoading(true)

      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(vehicleData),
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.detail || "가격 예측 요청에 실패했습니다.")
        }

        setPrediction(result)
      } catch (apiError) {
        console.error("Predict API error:", apiError)

        const isLocalhost =
          typeof window !== "undefined" &&
          ["localhost", "127.0.0.1"].includes(window.location.hostname)

        if (isLocalhost) {
          setPrediction(createMockPrediction(vehicleData))
        } else {
          throw apiError instanceof Error
            ? apiError
            : new Error("가격 예측 요청에 실패했습니다.")
        }
      }

      setCurrentScreen(3)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      alert(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative mx-auto mt-3 min-h-screen max-w-[430px] bg-background shadow-2xl">
      <div className="pt-6">
        {currentScreen === 0 && (
          <WelcomeScreen
            onStart={() => {
              setEditStep(null)
              setCurrentScreen(1)
            }}
          />
        )}

        {currentScreen === 1 && (
          <VehicleInputScreen
            onNext={handleVehicleNext}
            onBack={() => setCurrentScreen(0)}
            initialData={vehicleData}
            initialStep={editStep}
          />
        )}

        {currentScreen === 2 && (
          <SummaryScreen
            vehicleData={vehicleData}
            isLoading={isLoading}
            onBack={() => {
              setEditStep("options")
              setCurrentScreen(1)
            }}
            onNext={handleSummaryNext}
            onEdit={handleEdit}
          />
        )}

        {currentScreen === 3 && (
          <PriceResultScreen
            vehicleData={vehicleData}
            prediction={prediction}
            onBack={() => setCurrentScreen(2)}
            onRegister={() => alert("등록 기능은 다음 단계에서 연결할 예정입니다.")}
          />
        )}
      </div>
    </div>
  )
}
