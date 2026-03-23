"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
  explanation?: {
    summary: string
    detail: string
    tip: string
    source?: string
    debug?: {
      openai_enabled?: boolean
      reason?: string
    }
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
const PREDICT_TIMEOUT_MS = 30000
const EXPLAIN_TIMEOUT_MS = 20000

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
  const hasAccident = String(vehicleData.accident || "").trim() === "사고 이력 있음"

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
    explanation: createFallbackExplanation(),
  }
}

function createFallbackExplanation(): NonNullable<PredictionData["explanation"]> {
  return {
    summary: "입력한 차량 조건을 바탕으로 예상 판매 가격대를 계산했어요.",
    detail:
      "연식, 주행거리, 사고 이력, 옵션 수를 함께 반영해 빠른 판매가와 적정 판매가, 기대 판매가를 구성했습니다.",
    tip: "급하게 판매해야 한다면 빠른 판매가를, 여유가 있다면 적정 판매가부터 시작해 보세요.",
    source: "fallback",
  }
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<0 | 1 | 2 | 3>(0)
  const [vehicleData, setVehicleData] = useState<VehicleFormData>(initialVehicleData)
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExplanationLoading, setIsExplanationLoading] = useState(false)
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
      setIsExplanationLoading(false)

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS)
        let res: Response

        try {
          res = await fetch("/api/predict", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(vehicleData),
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeoutId)
        }

        const rawText = await res.text()
        let result: Partial<PredictionData> | { detail?: string } = {}

        try {
          result = rawText ? JSON.parse(rawText) : {}
        } catch {
          throw new Error("가격 예측 서버 응답 형식이 올바르지 않습니다. 배포 상태를 확인해 주세요.")
        }

        if (!res.ok) {
          const errorDetail = "detail" in result ? result.detail : undefined
          throw new Error(errorDetail || "가격 예측 요청에 실패했습니다.")
        }

        const priceResult = result as Partial<PredictionData>
        const nextPrediction: PredictionData = {
          fastPrice: Number(priceResult.fastPrice ?? 0),
          fairPrice: Number(priceResult.fairPrice ?? 0),
          highPrice: Number(priceResult.highPrice ?? 0),
          pricingMeta: priceResult.pricingMeta,
          explanation: priceResult.explanation ?? createFallbackExplanation(),
        }

        setPrediction(nextPrediction)
        setCurrentScreen(3)

        if (nextPrediction.explanation?.source === "openai") {
          setIsExplanationLoading(false)
        } else {
          setIsExplanationLoading(true)
          void fetchExplanation(nextPrediction)
        }
      } catch (apiError) {
        console.error("Predict API error:", apiError)

        if (apiError instanceof Error && apiError.name === "AbortError") {
          throw new Error("가격 계산 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.")
        }

        const isLocalhost =
          typeof window !== "undefined" &&
          ["localhost", "127.0.0.1"].includes(window.location.hostname)

        if (isLocalhost) {
          setPrediction(createMockPrediction(vehicleData))
          setCurrentScreen(3)
        } else {
          throw apiError instanceof Error
            ? apiError
            : new Error("가격 예측 요청에 실패했습니다.")
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      alert(message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExplanation = async (basePrediction: PredictionData) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), EXPLAIN_TIMEOUT_MS)
      let res: Response

      try {
        res = await fetch("/api/explain-price", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...vehicleData,
            fastPrice: basePrediction.fastPrice,
            fairPrice: basePrediction.fairPrice,
            highPrice: basePrediction.highPrice,
          }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      const rawText = await res.text()
      let result: { explanation?: PredictionData["explanation"]; detail?: string } = {}

      try {
        result = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error("가격 설명 서버 응답 형식이 올바르지 않습니다.")
      }

      if (!res.ok) {
        throw new Error(result.detail || "가격 설명 요청에 실패했습니다.")
      }

      if (result.explanation) {
        setPrediction((currentPrediction) => {
          if (!currentPrediction) {
            return currentPrediction
          }

          return {
            ...currentPrediction,
            explanation: {
              ...createFallbackExplanation(),
              ...result.explanation,
            },
          }
        })
      }
    } catch (error) {
      console.error("Explain API error:", error)
    } finally {
      setIsExplanationLoading(false)
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
            isExplanationLoading={isExplanationLoading}
            onBack={() => setCurrentScreen(2)}
            onRegister={() => alert("등록 기능은 다음 단계에서 연결할 예정입니다.")}
          />
        )}
      </div>

      {isLoading && currentScreen === 2 && (
        <div className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm">
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-[320px] -translate-x-1/2 -translate-y-1/2 px-6">
            <div className="pointer-events-auto rounded-3xl border border-border bg-card/95 p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>

                <h3 className="text-lg font-semibold text-foreground">
                  AI가 예측값을 생성하고 있어요
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  입력한 차량 정보를 바탕으로 가격을 계산하고,
                  결과 설명까지 함께 준비하고 있어요.
                </p>

                <div className="mt-4 w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-left">
                  <p className="text-sm font-medium text-foreground">
                    잠시만 기다려 주세요
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    보통 5~15초 정도 걸릴 수 있어요. 예측 가격과 함께 AI 설명도 같이 생성하고 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
