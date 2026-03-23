"use client"

import {
  CarFront,
  ChevronRight,
  CircleDollarSign,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react"

interface WelcomeScreenProps {
  onStart: () => void
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="screen-shell flex min-h-screen flex-col bg-background">
      <header className="px-6 pb-4 pt-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <CarFront className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="screen-label text-primary">직거래</span>
        </div>
      </header>

      <main className="flex-1 px-6 pb-8 pt-4">
        <div className="mb-8">
          <h1 className="screen-hero mb-3 text-foreground">
            내 차 판매 가격
            <br />
            AI 예측 서비스
          </h1>
          <p className="screen-body text-muted-foreground">
            차량 정보를 입력하면 AI가 빠른 판매가, 적정 판매가, 기대 판매가를 한눈에 비교해서 보여드려요.
          </p>
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="screen-label mb-1 text-foreground">빠른 판매가</h3>
              <p className="screen-body text-muted-foreground">
                빠르게 거래를 진행하고 싶을 때 참고하기 좋은 가격이에요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
              <CircleDollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="screen-label mb-1 text-foreground">적정 판매가</h3>
              <p className="screen-body text-muted-foreground">
                차량 상태와 시장 흐름을 함께 반영한 가장 무난한 추천 가격이에요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="screen-label mb-1 text-foreground">기대 판매가</h3>
              <p className="screen-body text-muted-foreground">
                시간 여유가 있다면 조금 더 높은 가격으로 반응을 살펴볼 수 있어요.
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center py-6">
          <div className="relative">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
              <CarFront className="h-16 w-16 text-primary" />
            </div>
            <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </div>
      </main>

      <div className="px-6 pb-8">
        <button
          type="button"
          onClick={onStart}
          className="screen-button flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          <span>시작하기</span>
          <ChevronRight className="h-5 w-5" />
        </button>

        <p className="screen-note mt-4 px-2 text-center text-muted-foreground">
          예측 결과는 참고용이며 실제 판매가는 차량 상태와 시장 상황에 따라 달라질 수 있어요.
        </p>
      </div>
    </div>
  )
}
