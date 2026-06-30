import { body } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

export const createBankValidators = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name is required")
    .bail()
    .isLength({ min: 1, max: 80 })
    .withMessage("name must be 80 characters or less"),
  validateRequest,
];
