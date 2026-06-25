import { body, param, query } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

const AMOUNT_MINOR_MIN = -2147483648;
const AMOUNT_MINOR_MAX = 2147483647;
const SUPPORTED_CURRENCIES = ["RUB", "EUR", "USD"] as const;
const SUPPORTED_SOURCE_TYPES = ["screenshot", "manual", "statement"] as const;

const amountMinorRule = body("amountMinor")
  .isInt({ min: AMOUNT_MINOR_MIN, max: AMOUNT_MINOR_MAX })
  .withMessage("amountMinor must be an integer minor-unit amount")
  .bail()
  .custom((value) => Number(value) !== 0)
  .withMessage("amountMinor must not be zero")
  .toInt();

const optionalAmountMinorRule = body("amountMinor")
  .optional()
  .isInt({ min: AMOUNT_MINOR_MIN, max: AMOUNT_MINOR_MAX })
  .withMessage("amountMinor must be an integer minor-unit amount")
  .bail()
  .custom((value) => Number(value) !== 0)
  .withMessage("amountMinor must not be zero")
  .toInt();

const currencyRule = body("currency")
  .optional()
  .isIn(SUPPORTED_CURRENCIES)
  .withMessage(`currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`);

const dateRule = body("date")
  .isISO8601()
  .withMessage("date must be an ISO 8601 date");

const optionalDateRule = body("date")
  .optional()
  .isISO8601()
  .withMessage("date must be an ISO 8601 date");

const merchantRule = body("merchant")
  .trim()
  .notEmpty()
  .withMessage("merchant is required")
  .bail()
  .isLength({ max: 160 })
  .withMessage("merchant must be 160 characters or less");

const optionalMerchantRule = body("merchant")
  .optional()
  .trim()
  .notEmpty()
  .withMessage("merchant must not be empty")
  .bail()
  .isLength({ max: 160 })
  .withMessage("merchant must be 160 characters or less");

const categoryIdRule = body("categoryId")
  .optional({ values: "null" })
  .isString()
  .withMessage("categoryId must be a string")
  .bail()
  .isLength({ min: 1, max: 128 })
  .withMessage("categoryId must be between 1 and 128 characters");

const confidenceRule = body("confidence")
  .optional({ values: "null" })
  .isFloat({ min: 0, max: 100 })
  .withMessage("confidence must be between 0 and 100")
  .toFloat();

const sourceTypeRule = body("sourceType")
  .optional()
  .isIn(SUPPORTED_SOURCE_TYPES)
  .withMessage(`sourceType must be one of: ${SUPPORTED_SOURCE_TYPES.join(", ")}`);

const notesRule = body("notes")
  .optional({ values: "null" })
  .isString()
  .withMessage("notes must be a string")
  .bail()
  .isLength({ max: 500 })
  .withMessage("notes must be 500 characters or less");

export const transactionListValidators = [
  query("startDate").optional().isISO8601().withMessage("startDate must be an ISO 8601 date"),
  query("endDate").optional().isISO8601().withMessage("endDate must be an ISO 8601 date"),
  query("categoryId").optional().isString().isLength({ min: 1, max: 128 }),
  query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
  query("offset").optional().isInt({ min: 0 }).toInt(),
  validateRequest,
];

export const transactionStatisticsValidators = [
  query("startDate").optional().isISO8601().withMessage("startDate must be an ISO 8601 date"),
  query("endDate").optional().isISO8601().withMessage("endDate must be an ISO 8601 date"),
  validateRequest,
];

export const transactionIdValidators = [
  param("id").isString().isLength({ min: 1, max: 128 }).withMessage("id is required"),
  validateRequest,
];

export const createTransactionValidators = [
  amountMinorRule,
  currencyRule,
  dateRule,
  merchantRule,
  categoryIdRule,
  confidenceRule,
  sourceTypeRule,
  notesRule,
  validateRequest,
];

export const updateTransactionValidators = [
  ...transactionIdValidators.slice(0, -1),
  optionalAmountMinorRule,
  currencyRule,
  optionalDateRule,
  optionalMerchantRule,
  categoryIdRule,
  confidenceRule,
  sourceTypeRule,
  notesRule,
  validateRequest,
];
