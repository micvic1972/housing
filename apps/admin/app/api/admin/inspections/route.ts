import { proxyProductService } from "../../../../lib/product-service";

export function GET() {
  return proxyProductService("/admin/inspections");
}
