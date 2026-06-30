import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

const bankNameRule = body("name")
  .trim()
  .notEmpty()
  .withMessage("name is required")
  .bail()
  .isLength({ min: 1, max: 80 })
  .withMessage("name must be 80 characters or less");

const keywordsRule = body("keywords")
  .optional()
  .isArray({ max: 20 })
  .withMessage("keywords must be an array with up to 20 items");

const keywordItemRule = body("keywords.*")
  .optional()
  .trim()
  .isLength({ min: 1, max: 80 })
  .withMessage("each keyword must be between 1 and 80 characters");

export const bankIdValidators = [
  param("id")
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage("id is required"),
  validateRequest,
];

export const createBankValidators = [
  bankNameRule,
  keywordsRule,
  keywordItemRule,
  validateRequest,
];

export const updateBankValidators = [
  ...bankIdValidators.slice(0, -1),
  bankNameRule,
  keywordsRule,
  keywordItemRule,
  validateRequest,
];
