import type { FastifyInstance } from "fastify";
import {
  cancelStudentInspectionRequest,
  acceptStudentInspectionReschedule,
  createInspectionRequest,
  declineStudentInspectionReschedule,
  listAdminInspectionRequests,
  listStudentInspectionRequests,
  updateAdminInspectionRequest,
} from "../../controller/inspection/inspection.controller.js";
import { requireClerkAdmin } from "../../middleware/require-clerk-admin.js";
import { requireClerkUser } from "../../middleware/require-clerk-user.js";

export async function inspectionRoutes(app: FastifyInstance) {
  app.post(
    "/inspections",
    { preHandler: requireClerkUser },
    createInspectionRequest,
  );
  app.get(
    "/inspections",
    { preHandler: requireClerkUser },
    listStudentInspectionRequests,
  );
  app.patch<{ Params: { id: string } }>(
    "/inspections/:id/cancel",
    { preHandler: requireClerkUser },
    cancelStudentInspectionRequest,
  );
  app.patch<{ Params: { id: string } }>(
    "/inspections/:id/accept-reschedule",
    { preHandler: requireClerkUser },
    acceptStudentInspectionReschedule,
  );
  app.patch<{ Params: { id: string } }>(
    "/inspections/:id/decline-reschedule",
    { preHandler: requireClerkUser },
    declineStudentInspectionReschedule,
  );
  app.get(
    "/admin/inspections",
    { preHandler: requireClerkAdmin },
    listAdminInspectionRequests,
  );
  app.patch<{ Params: { id: string } }>(
    "/admin/inspections/:id",
    { preHandler: requireClerkAdmin },
    updateAdminInspectionRequest,
  );
}
