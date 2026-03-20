"use client"

import {
  Activity,
  AlertTriangle,
  Car,
  CheckCircle2,
  ChevronLeft,
  Cog,
  Droplets,
  Edit3,
  FileText,
  Fuel,
  Gauge,
  Palette,
  Settings,
  Shield,
  Sun,
  Users,
} from "lucide-react"

type EditSection = "basic" | "status" | "accident" | "options"

interface SummaryScreenProps {
  onBack: () => void
  onNext: () => void
  onEdit: (section: EditSection) => void
  vehicleData: any
  isLoading?: boolean
}

const optionLabels: Record<string, string> = {
  sunroof: "선루프",
  ledHeadlamp: "LED 헤드램프",
  parkingSensor: "주차 센서",
  rearCamera: "후방 카메라",
  autoAC: "오토 에어컨",
  smartKey: "스마트키",
  navigation: "내비게이션",
  heatedSeat: "열선 시트",
  ventilatedSeat: "통풍 시트",
  leatherSeat: "가죽 시트",
}

function formatMileage(value: string) {
  const numeric = Number(String(value).replace(/,/g, ""))
  if (Number.isNaN(numeric)) return value || "-"
  return `${numeric.toLocaleString()}km`
}

function formatAccidentLabel(value: string) {
  if (!value) return "-"
  return String(value).trim() === "사고 이력 있음" ? "사고 이력 있음" : "무사고"
}

export function SummaryScreen({
  onBack,
  onNext,
  onEdit,
  vehicleData,
  isLoading = false,
}: SummaryScreenProps) {
  const hasAccident = String(vehicleData.accident || "").trim() === "사고 이력 있음"
  const selectedOptions = Array.isArray(vehicleData.options) ? vehicleData.options : []

  const InfoRow = ({
    label,
    value,
    icon: Icon,
    alert = false,
    empty = false,
  }: {
    label: string
    value: string
    icon: typeof Car
    alert?: boolean
    empty?: boolean
  }) => (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${alert ? "text-amber-500" : "text-muted-foreground"}`} />
        <span className="screen-caption text-muted-foreground">{label}</span>
      </div>
      <span
        className={`screen-body font-medium ${
          alert ? "text-amber-600" : empty ? "text-muted-foreground/60" : "text-foreground"
        }`}
      >
        {empty ? "-" : value}
      </span>
    </div>
  )

  const SectionCard = ({
    title,
    children,
    onEditClick,
  }: {
    title: string
    children: React.ReactNode
    onEditClick?: () => void
  }) => (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5">
        <h3 className="screen-label text-foreground">{title}</h3>
        {onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="screen-caption flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80"
          >
            <Edit3 className="h-3.5 w-3.5" />
            수정
          </button>
        )}
      </div>
      <div className="divide-y divide-border/50 px-5 py-2">{children}</div>
    </div>
  )

  return (
    <div className="screen-shell flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="flex h-14 items-center px-4">
          <button type="button" onClick={onBack} className="-ml-2 p-2 text-foreground" aria-label="뒤로가기">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="flex-1 text-center text-[22px] font-bold leading-[1.4] tracking-[-0.01em] text-foreground">입력 정보 확인</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-28">
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Car className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="screen-section-title text-foreground">
                {vehicleData.manufacturer} {vehicleData.model}
              </h2>
              <p className="screen-body text-muted-foreground">
                {vehicleData.trim ? `${vehicleData.trim} · ` : ""}
                {vehicleData.year || "-"}년식 · {formatMileage(vehicleData.mileage)}
              </p>
            </div>
          </div>

          <SectionCard title="차량 기본 정보" onEditClick={() => onEdit("basic")}>
            <InfoRow icon={Car} label="제조사" value={vehicleData.manufacturer || "-"} />
            <InfoRow icon={Car} label="모델" value={vehicleData.model || "-"} />
            <InfoRow icon={Settings} label="트림" value={vehicleData.trim || "-"} empty={!vehicleData.trim} />
            <InfoRow icon={Sun} label="연식" value={vehicleData.year ? `${vehicleData.year}년식` : "-"} />
            <InfoRow
              icon={Activity}
              label="배기량"
              value={vehicleData.displacement ? `${Number(vehicleData.displacement).toLocaleString()}cc` : "-"}
              empty={!vehicleData.displacement}
            />
            <InfoRow icon={Fuel} label="연료" value={vehicleData.fuel || "-"} />
            <InfoRow icon={Cog} label="변속기" value={vehicleData.transmission || "-"} />
            <InfoRow icon={Settings} label="차종" value={vehicleData.vehicleClass || "-"} />
            <InfoRow icon={Users} label="좌석 수" value={vehicleData.seats || "-"} />
            <InfoRow icon={Palette} label="색상" value={vehicleData.color || "-"} />
          </SectionCard>

          <SectionCard title="차량 상태" onEditClick={() => onEdit("status")}>
            <InfoRow icon={Gauge} label="주행거리" value={formatMileage(vehicleData.mileage)} />
            <InfoRow
              icon={Shield}
              label="사고 이력"
              value={formatAccidentLabel(vehicleData.accident)}
              alert={hasAccident}
            />
          </SectionCard>

          {hasAccident && (
            <SectionCard title="사고 관련 정보" onEditClick={() => onEdit("accident")}>
              <InfoRow icon={AlertTriangle} label="교환 부위" value={vehicleData.exchangeCount || "-"} alert />
              <InfoRow icon={AlertTriangle} label="판금 부위" value={vehicleData.paintCount || "-"} alert />
              <InfoRow icon={FileText} label="보험 이력" value={vehicleData.insuranceCount || "-"} alert />
              <InfoRow icon={Droplets} label="부식 여부" value={vehicleData.corrosion || "-"} alert />
            </SectionCard>
          )}

          <SectionCard title={`주요 옵션 (${selectedOptions.length}개)`} onEditClick={() => onEdit("options")}>
            {selectedOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2 py-3">
                {selectedOptions.map((optionId: string) => (
                  <span
                    key={optionId}
                    className="screen-caption inline-flex items-center rounded-xl bg-primary/10 px-3 py-2 font-medium text-primary"
                  >
                    {optionLabels[optionId] || optionId}
                  </span>
                ))}
              </div>
            ) : (
              <div className="screen-body py-4 text-center text-muted-foreground">선택한 옵션이 없습니다.</div>
            )}
          </SectionCard>

          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="screen-label mb-1 text-foreground">마지막으로 정보를 확인해 주세요</p>
              <p className="screen-note text-muted-foreground">
                입력한 내용을 바탕으로 판매 가격을 계산합니다. 정보가 정확할수록 결과도 더 현실적으로 나올
                가능성이 높아요.
              </p>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        <div className="mx-auto max-w-[430px]">
          <button
            type="button"
            onClick={onNext}
            disabled={isLoading}
            aria-busy={isLoading}
            className="screen-button h-14 w-full rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            AI 가격 예측 보기
          </button>
        </div>
      </div>
    </div>
  )
}
