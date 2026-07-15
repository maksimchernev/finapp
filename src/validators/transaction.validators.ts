import { body, oneOf, param, query } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

const AMOUNT_MINOR_MIN = -2147483648;
const AMOUNT_MINOR_MAX = 2147483647;
const SUPPORTED_CURRENCIES = ["RUB", "EUR", "USD", "HUF"] as const;
const SUPPORTED_SOURCE_TYPES = ["screenshot", "manual", "statement"] as const;

const amountMinorRuleAt = (path: string) => body(path)
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

const currencyRuleAt = (path: string) => body(path)
  .optional()
  .isIn(SUPPORTED_CURRENCIES)
  .withMessage(`currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`);

const currencyRule = currencyRuleAt("currency");

const dateRuleAt = (path: string) => body(path)
  .isISO8601()
  .withMessage("date must be an ISO 8601 date");

const optionalDateRule = body("date")
  .optional()
  .isISO8601()
  .withMessage("date must be an ISO 8601 date");

const merchantRuleAt = (path: string) => body(path)
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

const categoryIdRuleAt = (path: string) => body(path)
  .optional({ values: "null" })
  .isString()
  .withMessage("categoryId must be a string")
  .bail()
  .isLength({ min: 1, max: 128 })
  .withMessage("categoryId must be between 1 and 128 characters");

const categoryIdRule = categoryIdRuleAt("categoryId");

const bankIdRuleAt = (path: string) => body(path)
  .optional({ values: "null" })
  .isString()
  .withMessage("bankId must be a string")
  .bail()
  .isLength({ min: 1, max: 128 })
  .withMessage("bankId must be between 1 and 128 characters");

const bankIdRule = bankIdRuleAt("bankId");

const confidenceRuleAt = (path: string) => body(path)
  .optional({ values: "null" })
  .isFloat({ min: 0, max: 100 })
  .withMessage("confidence must be between 0 and 100")
  .toFloat();

const confidenceRule = confidenceRuleAt("confidence");

const sourceTypeRuleAt = (path: string) => body(path)
  .optional()
  .isIn(SUPPORTED_SOURCE_TYPES)
  .withMessage(`sourceType must be one of: ${SUPPORTED_SOURCE_TYPES.join(", ")}`);

const sourceTypeRule = sourceTypeRuleAt("sourceType");

const notesRuleAt = (path: string) => body(path)
  .optional({ values: "null" })
  .isString()
  .withMessage("notes must be a string")
  .bail()
  .isLength({ max: 500 })
  .withMessage("notes must be 500 characters or less");

const notesRule = notesRuleAt("notes");

function transactionCreateRules(pathPrefix = "") {
  return [
    amountMinorRuleAt(`${pathPrefix}amountMinor`),
    currencyRuleAt(`${pathPrefix}currency`),
    dateRuleAt(`${pathPrefix}date`),
    merchantRuleAt(`${pathPrefix}merchant`),
    categoryIdRuleAt(`${pathPrefix}categoryId`),
    bankIdRuleAt(`${pathPrefix}bankId`),
    confidenceRuleAt(`${pathPrefix}confidence`),
    sourceTypeRuleAt(`${pathPrefix}sourceType`),
    notesRuleAt(`${pathPrefix}notes`),
  ];
}

export const transactionListValidators = [
  query("startDate").optional().isISO8601({ strict: true, strictSeparator: true }).withMessage("startDate must be an ISO 8601 timestamp"),
  query("endDate")
    .optional()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("endDate must be an ISO 8601 timestamp")
    .bail()
    .custom((endDate, { req }) => {
      const startDate = req.query?.startDate;
      if (typeof startDate !== "string") return true;
      return new Date(startDate).getTime() < new Date(endDate).getTime();
    })
    .withMessage("endDate must be later than startDate"),
  query("bankId").optional().isString().isLength({ min: 1, max: 128 }),
  query("categoryId").optional().isString().isLength({ min: 1, max: 128 }),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
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
  oneOf([
    transactionCreateRules(),
    [
      body().isArray({ min: 1 }).withMessage("transactions batch must not be empty"),
      ...transactionCreateRules("*."),
    ],
  ]),
  validateRequest,
];

export const updateTransactionValidators = [
  ...transactionIdValidators.slice(0, -1),
  optionalAmountMinorRule,
  currencyRule,
  optionalDateRule,
  optionalMerchantRule,
  categoryIdRule,
  bankIdRule,
  confidenceRule,
  sourceTypeRule,
  notesRule,
  validateRequest,
];
