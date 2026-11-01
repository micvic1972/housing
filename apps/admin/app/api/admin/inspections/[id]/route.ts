import { NextRequest } from "next/server";
import { proxyProductService } from "../../../../../lib/product-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyProductService(`/admin/inspections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: await request.text(),
    contentType: "application/json",
  });
}
