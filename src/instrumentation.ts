import { validateEnv } from "@/lib/env";

export async function register() {
  validateEnv({ logOnce: true });
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  const { captureServerError } = await import("@/lib/error-tracker");
  const digest =
    err && typeof err === "object" && "digest" in err && typeof (err as { digest?: unknown }).digest === "string"
      ? (err as { digest: string }).digest
      : undefined;

  await captureServerError(err, {
    source: `nextjs:${context.routeType || "request"}`,
    route: context.routePath || request.path,
    method: request.method,
    url: request.path,
    digest,
    tags: {
      router_kind: context.routerKind || "app",
    },
  });
}
