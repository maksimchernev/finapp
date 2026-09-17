import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  addBalance,
  createCreditCard,
  deleteBalance,
  deleteCreditCard,
  getCreditCard,
  listCreditCards,
  updateBalance,
  updateCreditCard,
} from "../controllers/credit-card.controller";
import {
  creditCardBalanceValidators,
  creditCardIdValidators,
  creditCardWriteValidators,
} from "../validators/credit-card.validators";

const router = Router();
router.use(authenticate);

router.get("/", listCreditCards);
router.post("/", creditCardWriteValidators, createCreditCard);
router.get("/:id", creditCardIdValidators, getCreditCard);
router.patch("/:id", [...creditCardIdValidators.slice(0, -1), ...creditCardWriteValidators], updateCreditCard);
router.delete("/:id", creditCardIdValidators, deleteCreditCard);
router.post("/:id/balances", [...creditCardIdValidators.slice(0, -1), ...creditCardBalanceValidators], addBalance);
router.patch("/:id/balances/:balanceId", [...creditCardIdValidators.slice(0, -1), ...creditCardBalanceValidators], updateBalance);
router.delete("/:id/balances/:balanceId", creditCardIdValidators, deleteBalance);

export default router;
