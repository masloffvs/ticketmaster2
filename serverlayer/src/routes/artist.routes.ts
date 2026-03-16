import { container } from "@/core/di";
import { ArtistService } from "@/services";
import Elysia, { t } from "elysia";

export const artistRoutes = new Elysia({ prefix: "/artists" })
  .get("/", async () => {
    const service = container.resolve(ArtistService);
    return service.findAll();
  })
  .get(
    "/:id",
    async ({ params }) => {
      const service = container.resolve(ArtistService);
      const artist = await service.findById(params.id);
      if (!artist) {
        throw new Error("Artist not found");
      }
      return artist;
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body }) => {
      const service = container.resolve(ArtistService);
      return service.create(body);
    },
    {
      body: t.Object({
        name: t.String(),
        genre: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
        externalId: t.Optional(t.String()),
      }),
    },
  );
