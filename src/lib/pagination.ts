import { NextRequest, NextResponse } from "next/server";
import { captureServerError } from "@/lib/error-tracker";

export interface PaginationParams {
  limit: number;
  offset: number;
  rangeFrom: number;
  rangeTo: number;
  rangeHeader: string;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export function parsePagination(
  req: NextRequest | Request,
  opts?: { defaultLimit?: number; maxLimit?: number }
): PaginationParams {
  const defaultLimit = opts?.defaultLimit ?? 250;
  const maxLimit = opts?.maxLimit ?? 500;
  const url = new URL(req.url);

  const rawLimit = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), maxLimit)
      : defaultLimit;

  const rawOffset = url.searchParams.get("offset");
  const rawPage = Number(url.searchParams.get("page"));
  let offset = 0;

  if (rawOffset !== null && Number.isFinite(Number(rawOffset)) && Number(rawOffset) >= 0) {
    offset = Math.floor(Number(rawOffset));
  } else if (Number.isFinite(rawPage) && rawPage > 1) {
    offset = (Math.floor(rawPage) - 1) * limit;
  }

  const rangeFrom = offset;
  const rangeTo = offset + limit - 1;

  return {
    limit,
    offset,
    rangeFrom,
    rangeTo,
    rangeHeader: `${rangeFrom}-${rangeTo}`,
  };
}

export function parseContentRangeTotal(
  contentRange: string | null | undefined,
  fallbackLength: number
): number {
  if (!contentRange) return fallbackLength;
  const slashIdx = contentRange.indexOf("/");
  if (slashIdx === -1) return fallbackLength;
  const totalPart = contentRange.slice(slashIdx + 1).trim();
  const parsed = Number(totalPart);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallbackLength;
}

export function buildPaginationMeta(opts: {
  limit: number;
  offset: number;
  total?: number | null;
  returnedCount: number;
}): PaginationMeta {
  const total =
    typeof opts.total === "number" && Number.isFinite(opts.total)
      ? opts.total
      : opts.offset + opts.returnedCount;
  const hasMore =
    typeof opts.total === "number" && Number.isFinite(opts.total)
      ? opts.offset + opts.returnedCount < opts.total
      : opts.returnedCount >= opts.limit;

  return {
    limit: opts.limit,
    offset: opts.offset,
    total,
    hasMore,
  };
}

export interface DateWindowParams {
  month: string | null;
  from: string | null;
  to: string | null;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T[\d:.+-Z]+)?$/;

export function parseDateWindow(req: NextRequest | Request): DateWindowParams {
  const url = new URL(req.url);
  const rawMonth = (url.searchParams.get("month") || "").trim();
  const rawFrom = (url.searchParams.get("from") || url.searchParams.get("since") || "").trim();
  const rawTo = (url.searchParams.get("to") || url.searchParams.get("until") || "").trim();

  let from = ISO_DATE_RE.test(rawFrom) ? rawFrom : null;
  let to = ISO_DATE_RE.test(rawTo) ? rawTo : null;
  const month = MONTH_RE.test(rawMonth) ? rawMonth : null;

  if (month && !from && !to) {
    const [yrStr, moStr] = month.split("-");
    const yr = Number(yrStr);
    const mo = Number(moStr);
    const nextYr = mo === 12 ? yr + 1 : yr;
    const nextMo = mo === 12 ? 1 : mo + 1;
    from = `${yrStr}-${moStr}-01`;
    to = `${String(nextYr).padStart(4, "0")}-${String(nextMo).padStart(2, "0")}-01`;
  }

  return { month, from, to };
}

export async function apiErrorResponse(
  err: unknown,
  userMessage: string,
  opts?: { status?: number; route?: string; orgId?: string | null }
): Promise<NextResponse> {
  const status = opts?.status ?? 500;
  const errorId = await captureServerError(err, {
    source: "api-route",
    route: opts?.route,
    orgId: opts?.orgId,
    level: status >= 500 ? "error" : "warning",
  });
  return NextResponse.json({ error: userMessage, errorId }, { status });
}

export async function safeJsonBody<T = Record<string, unknown>>(
  req: NextRequest | Request
): Promise<{ ok: true; body: T } | { ok: false; res: NextResponse }> {
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        res: NextResponse.json({ error: "Expected a JSON object body." }, { status: 400 }),
      };
    }
    return { ok: true, body: parsed as T };
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 }),
    };
  }
}
