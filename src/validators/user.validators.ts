import { body } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

export const updateProfileValidators = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name is required")
    .bail()
    .isLength({ max: 80 })
    .withMessage("name must be 80 characters or less"),
  validateRequest,
];
