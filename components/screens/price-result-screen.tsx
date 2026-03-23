"use client"

import {
  Calendar,
  CarFront,
  ChevronLeft,
  CircleDollarSign,
  Fuel,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react"

interface PriceResultScreenProps {
  onBack: () => void
  onRegister: () => void
  vehicleData: any
  prediction: {
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
  } | null
  isExplanationLoading?: boolean
}

function normalizePrice(value: number) {
  const rounded = Math.round(value)
  return rounded >= 100000 ? Math.round(rounded / 10000) : rounded
}

function formatPrice(value: number) {
  return `${normalizePrice(value).toLocaleString()}만원`
}

function formatMileage(value: string) {
  const numeric = Number(String(value).replace(/,/g, ""))
  if (Number.isNaN(numeric)) return value || "-"
  return `${numeric.toLocaleString()}km`
}

function getVehicleAge(year: string) {
  const numericYear = Number(year)
  if (Number.isNaN(numericYear)) return 0
  return Math.max(new Date().getFullYear() - numericYear, 0)
}

function hasAccidentHistory(vehicleData: any) {
  return String(vehicleData.accident || "").trim() === "사고 이력 있음"
}

function getAccidentText(vehicleData: any) {
  return hasAccidentHistory(vehicleData) ? "사고 이력 있음" : "무사고"
}

function getOptionCount(vehicleData: any) {
  return Array.isArray(vehicleData.options) ? vehicleData.options.length : 0
}

function getMarketData(prediction: PriceResultScreenProps["prediction"]) {
  const fair = prediction?.fairPrice ?? 0
  return {
    low: Math.round(fair * 0.86),
    avg: Math.round(fair),
    high: Math.round(fair * 1.18),
  }
}

function getInsightItems(vehicleData: any, prediction: PriceResultScreenProps["prediction"]) {
  const age = getVehicleAge(vehicleData.year)
  const mileageNum = Number(String(vehicleData.mileage).replace(/,/g, "")) || 0
  const hasAccident = hasAccidentHistory(vehicleData)
  const optionCount = getOptionCount(vehicleData)

  const items: string[] = []

  if (age <= 3) {
    items.push("연식이 비교적 최신이라 첫인상에서 유리한 편이에요.")
  } else if (age <= 7) {
    items.push("연식은 시장 평균 수준으로 반영됐어요.")
  } else {
    items.push("연식이 다소 있는 편이라 감가가 일부 반영됐어요.")
  }

  if (mileageNum <= 50000) {
    items.push("주행거리가 낮아 가격 방어에 도움이 돼요.")
  } else if (mileageNum <= 100000) {
    items.push("주행거리는 평균 수준으로 반영됐어요.")
  } else {
    items.push("주행거리가 높은 편이라 보수적으로 계산됐어요.")
  }

  if (hasAccident) {
    items.push("사고 이력이 있어 판매 가격을 조금 더 신중하게 잡았어요.")
  } else {
    items.push("무사고 조건이 긍정적으로 작용했어요.")
  }

  if (optionCount >= 5) {
    items.push("주요 옵션 구성이 좋아 상단 가격 형성에 도움이 돼요.")
  } else if (optionCount >= 2) {
    items.push("옵션 구성은 무난한 편이에요.")
  } else {
    items.push("옵션 영향은 비교적 제한적인 편이에요.")
  }

  if ((prediction?.fairPrice ?? 0) > 0) {
    items.push("유사 차량 시세 범위를 함께 고려해 적정 가격대를 맞췄어요.")
  }

  return items
}

function getPricingComment(type: "fast" | "fair" | "high", vehicleData: any) {
  const hasAccident = hasAccidentHistory(vehicleData)

  if (type === "fast") {
    return hasAccident
      ? "사고 이력을 감안해도 문의를 빠르게 받을 수 있도록 현실적으로 잡은 가격이에요."
      : "빠른 거래 성사를 우선할 때 가장 부담이 적은 시작 가격이에요."
  }

  if (type === "fair") {
    return hasAccident
      ? "차량 상태를 반영하면서도 실제 판매 가능성을 고려한 균형 잡힌 가격이에요."
      : "시세와 차량 조건을 함께 반영한 가장 무난한 추천 가격이에요."
  }

  return hasAccident
    ? "시간은 조금 더 걸릴 수 있지만 좋은 조건의 구매자를 기다려볼 수 있어요."
    : "여유를 두고 올려두면서 더 높은 가격 반응을 기대해볼 수 있어요."
}

export function PriceResultScreen({
  onBack,
  onRegister,
  vehicleData,
  prediction,
  isExplanationLoading = false,
}: PriceResultScreenProps) {
  const marketData = getMarketData(prediction)
  const accidentText = getAccidentText(vehicleData)
  const optionCount = getOptionCount(vehicleData)
  const pricingMeta = prediction?.pricingMeta
  const hasAccident = hasAccidentHistory(vehicleData)
  const insightItems = getInsightItems(vehicleData, prediction)

  const explanationSummary =
    prediction?.explanation?.summary ||
    "AI가 가격 형성 이유를 정리하고 있어요."
  const explanationDetail =
    prediction?.explanation?.detail ||
    "입력한 차량 조건을 바탕으로 설명을 준비하는 중이에요. 잠시만 기다려 주세요."
  const explanationTip =
    prediction?.explanation?.tip ||
    "설명이 준비되면 판매 전략 팁도 함께 보여드릴게요."
  const isOpenAiExplanation = prediction?.explanation?.source === "openai"

  const strategies = [
    {
      key: "fast",
      title: "빠른 판매",
      price: prediction?.fastPrice ?? 0,
      period: "1주 내 판매 가능",
      description: getPricingComment("fast", vehicleData),
      icon: TrendingUp,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      cardClass: "border border-border bg-card",
      titleColor: "text-foreground",
    },
    {
      key: "fair",
      title: "적정 판매",
      price: prediction?.fairPrice ?? 0,
      period: "2~3주 내 판매 가능",
      description: getPricingComment("fair", vehicleData),
      icon: CircleDollarSign,
      iconBg: "bg-orange-50",
      iconColor: "text-primary",
      cardClass: "border-2 border-primary/30 bg-card shadow-[0_6px_20px_rgba(15,23,42,0.06)]",
      titleColor: "text-primary",
      recommended: true,
    },
    {
      key: "high",
      title: "최대 수익",
      price: prediction?.highPrice ?? 0,
      period: "더 높은 가격 기대",
      description: getPricingComment("high", vehicleData),
      icon: Sparkles,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      cardClass: "border border-border bg-card",
      titleColor: "text-foreground",
    },
  ]

  const summaryBadges = [
    `${vehicleData.manufacturer || ""} ${vehicleData.model || ""}`.trim(),
    vehicleData.year ? `${vehicleData.year}년식` : "",
    vehicleData.displacement ? `${Number(vehicleData.displacement).toLocaleString()}cc` : "",
    vehicleData.fuel || "",
    vehicleData.mileage ? formatMileage(vehicleData.mileage) : "",
    accidentText,
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-14 items-center px-4">
           <button
             type="button"
             onClick={onBack}
             className="-ml-2 p-2 text-foreground transition-colors"
              >
             <ChevronLeft className="h-6 w-6" />
           </button>
           <h1 className="flex-1 text-center text-[22px] font-bold leading-[1.4] tracking-[-0.01em] text-foreground">가격 예측 결과</h1>
           <div className="w-10" />
        </div>
      </header>

      <div className="space-y-5 px-6 py-5">
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
              <CarFront className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="screen-label text-foreground">
                {vehicleData.manufacturer} {vehicleData.model} {vehicleData.trim || ""}
              </p>
              <p className="screen-body mt-1 text-muted-foreground">{explanationSummary}</p>
            </div>
          </div>

          {isOpenAiExplanation && (
            <div className="mt-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
              <span className="screen-caption font-medium text-primary">AI 설명 반영됨</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {summaryBadges.map((badge) => (
              <span
                key={badge}
                className="screen-caption rounded-full border border-border bg-white px-3 py-1.5 text-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <h2 className="screen-section-title text-foreground">추천 판매 가격</h2>
          </div>

          <div className="space-y-3">
            {strategies.map((strategy) => {
              const Icon = strategy.icon

              return (
                <div key={strategy.key} className={`rounded-3xl p-4 ${strategy.cardClass}`}>
                  {strategy.recommended && (
                    <div className="mb-3 inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                      가장 무난해요
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${strategy.iconBg}`}>
                        <Icon className={`h-5 w-5 ${strategy.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`screen-label ${strategy.titleColor}`}>{strategy.title}</p>
                        <p className="screen-caption mt-0.5 text-muted-foreground">{strategy.period}</p>
                        <p className="screen-body mt-2 text-muted-foreground">{strategy.description}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="whitespace-nowrap leading-none text-foreground">
                        <span className="text-[1.45rem] font-extrabold tracking-tight sm:text-[1.7rem]">
                          {normalizePrice(strategy.price).toLocaleString()}
                        </span>
                        <span className="ml-1 text-[0.8rem] font-semibold text-muted-foreground sm:text-sm">
                          만원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="screen-section-title text-foreground">유사 차량 시세</h2>
          </div>

          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="screen-body text-muted-foreground">
              {vehicleData.model} {vehicleData.year ? `${vehicleData.year}년식` : ""} 기준 예상 시세 범위예요.
            </p>

            <div className="mb-3 mt-4">
              <div className="relative h-2 rounded-full bg-orange-100">
                <div className="absolute inset-y-0 left-[12%] right-[12%] rounded-full bg-orange-200" />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-white bg-primary shadow"
                  style={{ left: "50%" }}
                />
              </div>

              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>최저가</span>
                <span className="font-semibold text-primary">평균가</span>
                <span>최고가</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-background p-3 text-center">
                <p className="text-[1.35rem] font-bold text-foreground sm:text-2xl">{normalizePrice(marketData.low).toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">최저가</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-background p-3 text-center">
                <p className="text-[1.35rem] font-bold text-primary sm:text-2xl">{normalizePrice(marketData.avg).toLocaleString()}</p>
                <p className="mt-1 text-xs text-primary">평균가</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-3 text-center">
                <p className="text-[1.35rem] font-bold text-foreground sm:text-2xl">{normalizePrice(marketData.high).toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">최고가</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="screen-section-title text-foreground">가격 해석</h2>
            {isExplanationLoading && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                AI 설명 생성 중...
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="screen-caption font-semibold text-foreground">요약</p>
              </div>
              <p className="screen-body text-foreground">{explanationSummary}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="screen-caption font-semibold text-foreground">한눈에 보기</p>
              </div>
              <ul className="screen-body list-disc space-y-2 pl-5 text-foreground marker:text-primary">
                {insightItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                <p className="screen-caption font-semibold text-foreground">이 가격으로 본 이유</p>
              </div>
              <p className="screen-body text-muted-foreground">{explanationDetail}</p>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="screen-caption font-semibold text-foreground">판매 팁</p>
              </div>
              <p className="screen-body text-foreground">{explanationTip}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="screen-caption font-semibold text-foreground">연식</span>
                </div>
                <p className="screen-body text-muted-foreground">
                  {vehicleData.year}년식 · 차량연령 {getVehicleAge(vehicleData.year)}년
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  <span className="screen-caption font-semibold text-foreground">주행거리</span>
                </div>
                <p className="screen-body text-muted-foreground">{formatMileage(vehicleData.mileage)}</p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-primary" />
                  <span className="screen-caption font-semibold text-foreground">연료/배기량</span>
                </div>
                <p className="screen-body text-muted-foreground">
                  {vehicleData.fuel} · {Number(vehicleData.displacement).toLocaleString()}cc
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center gap-2">
                  {hasAccident ? (
                    <ShieldAlert className="h-4 w-4 text-primary" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  )}
                  <span className="screen-caption font-semibold text-foreground">차량 상태</span>
                </div>
                <p className="screen-body text-muted-foreground">
                  {hasAccident
                    ? `사고 이력 있음 · 교환 ${vehicleData.exchangeCount || "없음"} · 판금 ${vehicleData.paintCount || "없음"}`
                    : "무사고"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-primary" />
                <span className="screen-caption font-semibold text-foreground">주요 옵션</span>
              </div>
              <p className="screen-body text-muted-foreground">
                {optionCount > 0 ? `${optionCount}개의 주요 옵션이 가격에 반영되었어요.` : "선택한 주요 옵션은 없어요."}
              </p>
            </div>

            {pricingMeta && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">기준 시세 중앙값</p>
                  <p className="mt-2 text-lg font-bold text-foreground">{formatPrice(pricingMeta.baseQ50)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">직거래 보정 마진율</p>
                  <p className="mt-2 text-lg font-bold text-foreground">
                    {(pricingMeta.marginRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        <div className="mx-auto flex max-w-[430px] gap-3">
          <button
            type="button"
            onClick={onBack}
            className="screen-button h-14 flex-1 rounded-2xl bg-muted text-foreground transition-colors hover:bg-muted/80"
          >
            다시 수정
          </button>

          <button
            type="button"
            onClick={onRegister}
            className="screen-button h-14 flex-1 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            판매 등록하기
          </button>
        </div>
      </div>
    </div>
  )
}
