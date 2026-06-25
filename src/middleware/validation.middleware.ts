import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    next();
    return;
  }

  res.status(400).json({
    error: "Validation failed",
    details: result.array({ onlyFirstError: true }).map((validationError) => ({
      field: "path" in validationError ? validationError.path : undefined,
      message: validationError.msg,
    })),
  });
}
