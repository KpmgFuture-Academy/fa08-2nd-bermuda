import { NextResponse } from "next/server"

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000"
const EXPLAIN_TIMEOUT_MS = 20000

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND_URL
  )
}

function buildExplainUrl(rawBaseUrl: string) {
  const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "")

  if (normalizedBaseUrl.endsWith("/explain-price")) {
    return normalizedBaseUrl
  }

  if (normalizedBaseUrl.endsWith("/predict")) {
    return normalizedBaseUrl.replace(/\/predict$/, "/explain-price")
  }

  return `${normalizedBaseUrl}/explain-price`
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const backendBaseUrl = getBackendBaseUrl()
    const isLocalBackend = backendBaseUrl === DEFAULT_BACKEND_URL
    const isProduction = process.env.NODE_ENV === "production"

    if (isProduction && isLocalBackend) {
      return NextResponse.json(
        {
          detail:
            "배포 환경의 가격 설명 백엔드가 연결되지 않았습니다. BACKEND_API_URL 환경 변수를 설정해 주세요.",
        },
        { status: 503 },
      )
    }

    const backendUrl = buildExplainUrl(backendBaseUrl)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), EXPLAIN_TIMEOUT_MS)

    let response: Response

    try {
      response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const responseText = await response.text()
    const trimmedResponseText = responseText.trim()

    if (trimmedResponseText) {
      try {
        const parsed = JSON.parse(trimmedResponseText)
        return NextResponse.json(parsed, { status: response.status })
      } catch {
        return NextResponse.json(
          {
            detail: `가격 설명 서버 응답을 해석하지 못했습니다. (${response.status})`,
            upstreamStatus: response.status,
            upstreamUrl: backendUrl,
            upstreamPreview: trimmedResponseText.slice(0, 180) || undefined,
          },
          { status: 502 },
        )
      }
    }

    return NextResponse.json(
      {
        detail: `가격 설명 서버가 비어 있는 응답을 반환했습니다. (${response.status})`,
        upstreamStatus: response.status,
        upstreamUrl: backendUrl,
      },
      { status: 502 },
    )
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { detail: "가격 설명 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요." },
        { status: 504 },
      )
    }

    const detail =
      error instanceof Error
        ? error.message
        : "가격 설명 서버에 연결하지 못했습니다."

    return NextResponse.json(
      { detail: `가격 설명 서버 연결에 실패했습니다. ${detail}`.trim() },
      { status: 502 },
    )
  }
}
