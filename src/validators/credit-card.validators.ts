import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validation.middleware";

function isCalendarDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateRule = (field: string) => body(field)
  .custom((value) => value === null || isCalendarDate(value))
  .withMessage(`${field} must be a calendar date or null`);

export const creditCardIdValidators = [
  param("id").isString().isLength({ min: 1, max: 128 }),
  validateRequest,
];

export const creditCardWriteValidators = [
  body("name").isString().trim().notEmpty().isLength({ max: 80 }),
  body("currency").isIn(["RUB", "EUR", "USD", "HUF"]),
  dateRule("gracePeriodEndDate"),
  body("gracePaid").isBoolean(),
  dateRule("minPaymentAssignmentDate"),
  dateRule("minPaymentDueDate"),
  body("minPaymentAmountMinor").custom((value) => value === null || (Number.isSafeInteger(value) && value >= 0 && value <= 2147483647)),
  body("minPaymentPaid").isBoolean(),
  body().custom((value) => {
    const hasDate = value.minPaymentDueDate !== null && value.minPaymentDueDate !== undefined;
    const hasAmount = value.minPaymentAmountMinor !== null && value.minPaymentAmountMinor !== undefined;
    return hasDate === hasAmount
      && (!value.minPaymentPaid || hasDate)
      && (!value.gracePaid || Boolean(value.gracePeriodEndDate));
  }).withMessage("minimum payment date and amount must be supplied together"),
  validateRequest,
];

export const creditCardBalanceValidators = [
  dateRule("date"),
  body("date").notEmpty(),
  body("amountMinor").isInt({ min: 0, max: 2147483647 }),
  validateRequest,
];
