import { container } from "@/core/di";
import { PartnerService } from "@/services/partner.service";
import Elysia from "elysia";

export const binRoutes = new Elysia({ prefix: "/bin" }).post(
  "",
  async ({ request }) => {
    const service = container.resolve(PartnerService);

    try {
      const payload = service.decodeBinaryFrame(await request.arrayBuffer());
      const result = await service.handleBinRequest(payload);
      return new Response(service.successFrame(result), {
        headers: {
          "content-type": "application/octet-stream",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      return new Response(service.errorFrame(error), {
        status: 400,
        headers: {
          "content-type": "application/octet-stream",
          "cache-control": "no-store",
        },
      });
    }
  },
);
