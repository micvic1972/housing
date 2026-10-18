import { NextRequest } from "next/server";
import { proxyProductService } from "../../../../../lib/product-service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyProductService(`/listings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
