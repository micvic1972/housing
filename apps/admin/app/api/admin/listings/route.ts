import { NextRequest } from "next/server";
import { proxyProductService } from "../../../../lib/product-service";

export function GET() {
  return proxyProductService("/listings");
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyProductService("/listings", {
    method: "POST",
    body,
    contentType: "application/json",
  });
}
