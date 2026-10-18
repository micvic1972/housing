import { NextRequest } from "next/server";
import { proxyProductService } from "../../../../../lib/product-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyProductService(`/listings/${encodeURIComponent(id)}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.text();
  return proxyProductService(`/listings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
    contentType: "application/json",
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyProductService(`/listings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
