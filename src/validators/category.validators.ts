import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

const categoryNameRule = body("nameRu")
  .trim()
  .notEmpty()
  .withMessage("nameRu is required")
  .bail()
  .isLength({ min: 1, max: 80 })
  .withMessage("nameRu must be 80 characters or less");

const categoryTypeRule = body("type")
  .isIn(["expense", "income"])
  .withMessage("type must be expense or income");

const requiredStringRule = (field: string) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isLength({ min: 1, max: 80 })
    .withMessage(`${field} must be 80 characters or less`);

const colorRule = (field: string) =>
  body(field)
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage(`${field} must be a hex color`);

const keywordsRule = body("keywords")
  .optional()
  .isArray({ max: 30 })
  .withMessage("keywords must be an array with up to 30 items");

const keywordItemRule = body("keywords.*")
  .optional()
  .trim()
  .isLength({ min: 1, max: 80 })
  .withMessage("each keyword must be between 1 and 80 characters");

export const categoryIdValidators = [
  param("id")
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage("id is required"),
  validateRequest,
];

export const categoryWriteValidators = [
  categoryNameRule,
  categoryTypeRule,
  requiredStringRule("icon"),
  colorRule("color"),
  colorRule("bgColor"),
  keywordsRule,
  keywordItemRule,
  validateRequest,
];

export const updateCategoryValidators = [
  ...categoryIdValidators.slice(0, -1),
  ...categoryWriteValidators,
];
