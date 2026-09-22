import { Router, type IRouter } from "express";
import { db, customUiRequestsTable } from "@workspace/db";
import { CreateCustomUiRequestBody, CreateCustomUiRequestResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/custom-ui-requests", async (req, res) => {
  const body = CreateCustomUiRequestBody.parse(req.body);

  const [request] = await db
    .insert(customUiRequestsTable)
    .values({
      gameId: body.gameId ?? null,
      name: body.name,
      email: body.email,
      message: body.message,
    })
    .returning();

  res.json(CreateCustomUiRequestResponse.parse(request));
});

export default router;
