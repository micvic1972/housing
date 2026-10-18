import { NextResponse } from "next/server";
import { getAdminBearerToken } from "./admin-authorization";

type ProxyOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: BodyInit;
  contentType?: string;
};

export async function proxyProductService(
  path: string,
  { method = "GET", body, contentType }: ProxyOptions = {},
) {
  const apiBase =
    process.env.PRODUCT_SERVICE_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return NextResponse.json(
      { error: "The admin API connection is not configured on the server." },
      { status: 503 },
    );
  }

  const access = await getAdminBearerToken();
  if (access.status === "misconfigured") {
    return NextResponse.json(
      { error: "Clerk admin authentication is not configured on the server." },
      { status: 503 },
    );
  }
  if (access.status === "unauthenticated") {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }
  if (access.status === "forbidden") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  let target: URL;
  try {
    target = new URL(`${apiBase.replace(/\/+$/, "")}${path}`);
  } catch {
    return NextResponse.json(
      { error: "The admin API address is invalid." },
      { status: 503 },
    );
  }

  const headers = new Headers({
    authorization: `Bearer ${access.token}`,
  });
  if (contentType) headers.set("content-type", contentType);

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    const responseBody = upstream.status === 204 ? null : await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the product service." },
      { status: 502 },
    );
  }
}
