"use client"

import {
  ArrowLeft,
  Calendar,
  CarFront,
  CircleDollarSign,
  Fuel,
  Gauge,
  Lightbulb,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react"

interface AIExplanation {
  summary: string
  factors: {
    label: string
    impact: "positive" | "neutral" | "negative"
    description: string
  }[]
  strategies: {
    fast: string
    fair: string
    high: string
  }
}

interface PriceResultScreenProps {
  onBack: () => void
  onRegister: () => void
  vehicleData: any
  prediction: {
    fastPrice: number
    fairPrice: number
    highPrice: number
    explanation: {
      summary: string
      detail: string
      tip: string
    }
  } | null
}

function normalizePrice(value: number) {
  const rounded = Math.round(value)
  return rounded >= 100000 ? Math.round(rounded / 10000) : rounded
}

function formatPrice(value: number) {
  return `${normalizePrice(value).toLocaleString()}만원`
}

function formatMileage(value: string) {
  const n = Number(String(value).replace(/,/g, ""))
  if (Number.isNaN(n)) return value
  return `${n.toLocaleString()}km`
}

function getVehicleAge(year: string) {
  const y = Number(year)
  if (Number.isNaN(y)) return 0
  return Math.max(2024 - y, 0)
}

function getAccidentText(vehicleData: any) {
  return vehicleData.accident === "사고 이력 있음" ? "사고 이력 있음" : "무사고"
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

function getInsightText(vehicleData: any, prediction: PriceResultScreenProps["prediction"]) {
  const age = getVehicleAge(vehicleData.year)
  const mileageNum = Number(String(vehicleData.mileage).replace(/,/g, "")) || 0
  const hasAccident = vehicleData.accident === "사고 이력 있음"
  const optionCount = getOptionCount(vehicleData)

  const parts: string[] = []

  if (age <= 3) {
    parts.push("연식이 비교적 최신")
  } else if (age <= 7) {
    parts.push("연식은 중간 수준")
  } else {
    parts.push("연식이 다소 있는 편")
  }

  if (mileageNum <= 50000) {
    parts.push("주행거리가 낮은 편")
  } else if (mileageNum <= 100000) {
    parts.push("주행거리는 평균 수준")
  } else {
    parts.push("주행거리가 다소 높은 편")
  }

  if (hasAccident) {
    parts.push("사고 이력이 가격에 일부 반영됨")
  } else {
    parts.push("무사고 조건이 가격 방어에 유리함")
  }

  if (optionCount >= 5) {
    parts.push("주요 옵션 구성이 좋은 편")
  } else if (optionCount >= 2) {
    parts.push("옵션 수준은 보통")
  } else {
    parts.push("옵션 영향은 제한적")
  }

  const fair = prediction?.fairPrice ?? 0
  if (fair > 0) {
    parts.push("유사 차량 시세 범위를 고려한 추천가")
  }

  return parts.join(" · ")
}

function getPricingComment(type: "fast" | "fair" | "high", vehicleData: any) {
  const hasAccident = vehicleData.accident === "사고 이력 있음"

  if (type === "fast") {
    return hasAccident
      ? "문의 전환을 높이고 빠르게 정리하기 좋은 가격대"
      : "거래 성사 가능성을 높인 빠른 판매 전략"
  }

  if (type === "fair") {
    return hasAccident
      ? "차량 상태를 반영하면서도 현실적인 균형 가격"
      : "시세와 차량 조건을 함께 반영한 추천 가격"
  }

  return hasAccident
    ? "시간은 더 걸릴 수 있지만 수익을 노려볼 수 있는 가격"
    : "여유 있게 올려두고 최고가를 노려보는 전략"
}

function getExplanationSummary(explanation?: string) {
  if (!explanation) return "입력한 차량 조건을 바탕으로 가격을 계산했어요."

  const cleaned = explanation.replace(/\n/g, " ").trim()
  const sentences = cleaned
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return sentences[0] || "입력한 차량 조건을 바탕으로 가격을 계산했어요."
}

function getExplanationDetail(explanation?: string) {
  if (!explanation) {
    return "연식, 주행거리, 사고 여부, 옵션 수준을 함께 반영한 결과예요."
  }

  const cleaned = explanation.replace(/\n/g, " ").trim()
  const sentences = cleaned
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length <= 1) return cleaned

  return sentences.slice(1).join(" · ")
}

export function PriceResultScreen({
  onBack,
  onRegister,
  vehicleData,
  prediction,
  explanation,
  isExplanationLoading = false,
}: PriceResultScreenProps) {
  const marketData = getMarketData(prediction)
  const recommendedPrice = prediction?.fairPrice ?? 0
  const accidentText = getAccidentText(vehicleData)
  const optionCount = getOptionCount(vehicleData)

  const explanationSummary =
    prediction?.explanation?.summary || "입력한 차량 조건을 바탕으로 가격을 계산했어요."

  const explanationDetail =
    prediction?.explanation?.detail || "연식, 주행거리, 사고 여부, 옵션 수준을 함께 반영한 결과예요."

  const explanationTip =
    prediction?.explanation?.tip || "빠르게 판매하려면 빠른 판매가에 가깝게, 여유가 있다면 적정 판매가 또는 최대 수익가 전략을 고려해보세요."
  
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
      cardClass: "border-2 border-primary bg-orange-50/40 shadow-[0_6px_20px_rgba(249,115,22,0.12)]",
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
    `${vehicleData.manufacturer} ${vehicleData.model}`,
    vehicleData.year ? `${vehicleData.year}년식` : "",
    vehicleData.displacement ? `${Number(vehicleData.displacement).toLocaleString()}cc` : "",
    vehicleData.fuel || "",
    vehicleData.mileage ? formatMileage(vehicleData.mileage) : "",
    accidentText,
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-6 pt-6 pb-4 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-[28px] font-bold text-foreground">추천 판매가격</h1>
          <div className="w-10" />
        </div>

        <div className="flex items-center gap-2 text-[22px] font-semibold text-primary mb-2">
          <span>3</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">3</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="w-full h-full bg-primary rounded-full" />
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0">
              <CarFront className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {vehicleData.manufacturer} {vehicleData.model} {vehicleData.trim || ""}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                입력한 차량 조건을 바탕으로 추천 가격을 계산했어요.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {summaryBadges.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 rounded-full bg-white text-[13px] text-foreground border border-border"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <CircleDollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">추천 판매가격</h2>
          </div>

          <div className="space-y-3">
            {strategies.map((strategy) => {
              const Icon = strategy.icon
              return (
                <div
                  key={strategy.key}
                  className={`rounded-3xl p-4 ${strategy.cardClass}`}
                >
                  {strategy.recommended && (
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold mb-3">
                      추천
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${strategy.iconBg}`}>
                        <Icon className={`w-5 h-5 ${strategy.iconColor}`} />
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${strategy.titleColor}`}>{strategy.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{strategy.period}</p>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {strategy.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[30px] font-extrabold tracking-tight text-foreground leading-none">
                        {normalizePrice(strategy.price).toLocaleString()}
                        <span className="text-lg font-semibold ml-1">만원</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">유사 차량 시세</h2>
          </div>

          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              {vehicleData.model} {vehicleData.year ? `${vehicleData.year}년식` : ""} 기준 추정 범위
            </p>

            <div className="mt-4 mb-3">
              <div className="relative h-2 rounded-full bg-orange-100">
                <div className="absolute inset-y-0 left-[12%] right-[12%] rounded-full bg-orange-200" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-4 border-white shadow"
                  style={{ left: "50%" }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>최저가</span>
                <span className="text-primary font-semibold">평균가</span>
                <span>최고가</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-2xl bg-background p-3 text-center border border-border">
                <p className="text-2xl font-bold text-foreground">{normalizePrice(marketData.low).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">최저가</p>
              </div>

              <div className="rounded-2xl bg-orange-50 p-3 text-center border border-primary/20">
                <p className="text-2xl font-bold text-primary">{normalizePrice(marketData.avg).toLocaleString()}</p>
                <p className="text-xs text-primary mt-1">평균가</p>
              </div>

              <div className="rounded-2xl bg-background p-3 text-center border border-border">
                <p className="text-2xl font-bold text-foreground">{normalizePrice(marketData.high).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">최고가</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">가격 해석</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-orange-50/70 border border-orange-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">AI 한 줄 요약</p>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {explanationSummary}
              </p>
            </div>

            <div className="rounded-2xl bg-background border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">AI가 본 가격 설명</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {explanationDetail}
              </p>
            </div>

            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">판매 전략 팁</p>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {explanationTip}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border p-4 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">연식</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {vehicleData.year}년식 · 차량연령 {getVehicleAge(vehicleData.year)}년
                </p>
              </div>

              <div className="rounded-2xl border border-border p-4 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">주행거리</span>
                </div>
                <p className="text-sm text-muted-foreground">{formatMileage(vehicleData.mileage)}</p>
              </div>

              <div className="rounded-2xl border border-border p-4 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Fuel className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">연료/배기량</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {vehicleData.fuel} · {Number(vehicleData.displacement).toLocaleString()}cc
                </p>
              </div>

              <div className="rounded-2xl border border-border p-4 bg-background">
                <div className="flex items-center gap-2 mb-2">
                  {vehicleData.accident === "사고 이력 있음" ? (
                    <ShieldAlert className="w-4 h-4 text-primary" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-sm font-semibold text-foreground">차량 상태</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {vehicleData.accident === "사고 이력 있음"
                    ? `사고 이력 있음 · 교환 ${vehicleData.exchangeCount || "없음"} · 판금 ${vehicleData.paintCount || "없음"}`
                    : "무사고"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">주요 옵션</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {optionCount > 0
                  ? `${optionCount}개 옵션이 반영되었어요`
                  : "선택된 주요 옵션은 없어요"}
              </p>
            </div>
          </div>
        </section>

        {/* AI가 본 가격 설명 섹션 */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">AI가 본 가격 설명</h2>
          </div>

          {isExplanationLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">AI가 가격을 분석하고 있어요...</p>
            </div>
          ) : explanation ? (
            <div className="space-y-4">
              {/* 요약 설명 */}
              <div className="rounded-2xl bg-orange-50/60 border border-orange-100 p-4">
                <p className="text-sm leading-relaxed text-foreground">
                  {explanation.summary}
                </p>
              </div>

              {/* 요인별 분석 */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground mb-3">가격에 영향을 준 요인</p>
                {explanation.factors.map((factor, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-2xl border border-border p-3 bg-background"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        factor.impact === "positive"
                          ? "bg-green-500"
                          : factor.impact === "negative"
                          ? "bg-red-400"
                          : "bg-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{factor.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{factor.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 전략별 해석 */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground mb-3">판매 전략 해석</p>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                    <p className="text-sm font-medium text-blue-700 mb-1">빠른 판매</p>
                    <p className="text-sm text-muted-foreground">{explanation.strategies.fast}</p>
                  </div>
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
                    <p className="text-sm font-medium text-primary mb-1">적정 판매</p>
                    <p className="text-sm text-muted-foreground">{explanation.strategies.fair}</p>
                  </div>
                  <div className="rounded-2xl border border-green-100 bg-green-50/40 p-3">
                    <p className="text-sm font-medium text-green-700 mb-1">최대 수익</p>
                    <p className="text-sm text-muted-foreground">{explanation.strategies.high}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 플레이스홀더 - explanation이 없을 때 기본 표시 */
            <div className="space-y-4">
              <div className="rounded-2xl bg-orange-50/60 border border-orange-100 p-4">
                <p className="text-sm leading-relaxed text-foreground">
                  입력하신 차량 정보를 종합적으로 분석한 결과, 현재 시장 상황과 차량 조건을 고려하여 위와 같은 추천 가격대를 산출했어요.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground mb-3">가격에 영향을 준 요인</p>
                <div className="flex items-start gap-3 rounded-2xl border border-border p-3 bg-background">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-green-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">연식</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {getVehicleAge(vehicleData.year)}년된 차량으로, 연식이 가격 산정에 반영되었어요.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border p-3 bg-background">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    Number(String(vehicleData.mileage).replace(/,/g, "")) <= 80000 ? "bg-green-500" : "bg-muted-foreground"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">주행거리</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatMileage(vehicleData.mileage)} 주행으로, 동급 차량 대비 주행거리가 가격에 영향을 주었어요.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border p-3 bg-background">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    vehicleData.accident === "사고 이력 있음" ? "bg-red-400" : "bg-green-500"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">사고 여부</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {vehicleData.accident === "사고 이력 있음"
                        ? "사고 이력이 있어 가격이 다소 보수적으로 산정되었어요."
                        : "무사고 차량으로 가격 방어에 유리해요."}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border p-3 bg-background">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    optionCount >= 3 ? "bg-green-500" : "bg-muted-foreground"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">옵션 수준</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {optionCount >= 5
                        ? "다양한 옵션이 포함되어 가격 상승 요인으로 작용했어요."
                        : optionCount >= 2
                        ? "기본적인 옵션이 포함되어 있어요."
                        : "옵션이 적어 가격 영향은 제한적이에요."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground mb-3">판매 전략 해석</p>
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                    <p className="text-sm font-medium text-blue-700 mb-1">빠른 판매</p>
                    <p className="text-sm text-muted-foreground">
                      빠르게 거래를 성사시키고 싶다면 이 가격대로 시작해보세요. 문의가 빨리 들어올 가능성이 높아요.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
                    <p className="text-sm font-medium text-primary mb-1">적정 판매</p>
                    <p className="text-sm text-muted-foreground">
                      시세와 차량 상태를 균형 있게 반영한 가격이에요. 합리적인 협상이 가능한 시작점이에요.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-green-100 bg-green-50/40 p-3">
                    <p className="text-sm font-medium text-green-700 mb-1">최대 수익</p>
                    <p className="text-sm text-muted-foreground">
                      시간 여유가 있다면 높은 가격으로 올려두고 기다려보세요. 좋은 조건의 구매자를 만날 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              위 분석은 AI가 입력된 차량 정보와 시장 데이터를 기반으로 제공하는 참고 자료입니다. 
              실제 거래 가격은 차량의 실물 상태, 지역, 계절, 협상 등에 따라 달라질 수 있어요.
            </p>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-[430px] mx-auto flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 h-14 bg-muted text-foreground font-semibold rounded-2xl hover:bg-muted/80 transition-colors"
          >
            조건 수정
          </button>

          <button
            type="button"
            onClick={onRegister}
            className="flex-1 h-14 bg-primary text-primary-foreground font-semibold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            등록하기
          </button>
        </div>
      </div>
    </div>
  )
}
