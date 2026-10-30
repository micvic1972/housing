import { NextRequest } from "next/server";
import { proxyProductService } from "../../../../../../../lib/product-service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id, imageId } = await params;
  return proxyProductService(
    `/listings/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" },
  );
}
