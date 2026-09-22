import { Router, type IRouter } from "express";
import { ListScenesResponse } from "@workspace/api-zod";
import { SCENES } from "../lib/scenes";

const router: IRouter = Router();

router.get("/scenes", (_req, res) => {
  const data = SCENES.map((s) => ({
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    description: s.description,
  }));
  res.json(ListScenesResponse.parse(data));
});

export default router;
