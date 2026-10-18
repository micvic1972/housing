import { NextRequest } from "next/server";
import { proxyProductService } from "../../../../../../lib/product-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.formData();
  return proxyProductService(
    `/listings/${encodeURIComponent(id)}/images`,
    {
      method: "POST",
      body,
    },
  );
}
