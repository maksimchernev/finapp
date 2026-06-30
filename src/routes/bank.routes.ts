import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createBank, getBanks, updateBank } from "../controllers/bank.controller";
import { createBankValidators, updateBankValidators } from "../validators/bank.validators";

const router = Router();

router.use(authenticate);

router.get("/", getBanks);
router.post("/", createBankValidators, createBank);
router.patch("/:id", updateBankValidators, updateBank);

export default router;
