import { NextRequest } from "next/server";
import { proxyProductService } from "../../../../../lib/product-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyProductService(`/admin/conversations/${encodeURIComponent(id)}`);
}
