import { Router } from "express";
import { contactSchema } from "../schemas/contact.js";
import { validate } from "../middlewares/validate.js";

export function contactRouter(contactRepository) {
  const router = Router();
  // TODO : brancher validate(contactSchema)
  router.post("/", validate(contactSchema), async (req, res, next) => {
    try {
      res.status(201).json(await contactRepository.create(req.body));
    } catch (err) {
      next(err);
    }
  });
  return router;
}
