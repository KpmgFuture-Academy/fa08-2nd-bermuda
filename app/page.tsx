"use client"

import { useEffect, useState } from "react"
import { WelcomeScreen } from "@/components/screens/welcome-screen"
import { VehicleInputScreen } from "@/components/screens/vehicle-input-screen"
import { SummaryScreen } from "@/components/screens/summary-screen"
import { PriceResultScreen } from "@/components/screens/price-result-screen"

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
  | "manufacturer" | "model" | "trim" | "year" | "displacement" | "fuel"
  | "transmission" | "vehicleClass" | "seats" | "color"
  | "mileage" | "accident" | "options"

type EditSection = "basic" | "status" | "accident" | "options"

const sectionToStep: Record<EditSection, Step> = {
  basic: "manufacturer",
  status: "mileage",
  accident: "accident",
  options: "options"
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

      // 주행거리 기반 mock 가격 계산 (실제 API 연결 전 UI 테스트용)
      const generateMockPrediction = (): PredictionData => {
        const basePriceFactor = vehicleData.year ? (2024 - parseInt(vehicleData.year)) : 5
        const mileage = parseInt(String(vehicleData.mileage).replace(/,/g, "")) || 50000
        const mileageFactor = mileage / 10000
        const accidentFactor = vehicleData.accident === "사고 이력 있음" ? 0.85 : 1
        const optionBonus = vehicleData.options.length * 50000
        
        const basePrice = Math.max(500, 3500 - (basePriceFactor * 200) - (mileageFactor * 50))
        const fairPrice = Math.round((basePrice * accidentFactor + optionBonus / 10000) / 10) * 10
        const fastPrice = Math.round((fairPrice * 0.92) / 10) * 10
        const highPrice = Math.round((fairPrice * 1.08) / 10) * 10
        
        return { fastPrice, fairPrice, highPrice }
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(vehicleData),
        })

        const result = await res.json()

        if (!res.ok) {
          throw new Error(result.detail || "예측 요청에 실패했습니다.")
        }

        setPrediction(result)
      } catch {
        // API 연결 실패 시 mock 데이터 사용 (UI 테스트용)
        console.log("[v0] API 연결 실패, mock 데이터 사용")
        setPrediction(generateMockPrediction())
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
    <div className="mx-auto max-w-[430px] min-h-screen bg-background shadow-2xl relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-foreground rounded-b-2xl z-50 pointer-events-none" />

      <div className="pt-[30px]">
        {currentScreen === 0 && (
          <WelcomeScreen onStart={() => {
            setEditStep(null)
            setCurrentScreen(1)
          }} />
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
            onRegister={() => alert("등록 기능은 프로토타입에서 지원하지 않아요")}
          />
        )}
      </div>


    </div>
  )
}
