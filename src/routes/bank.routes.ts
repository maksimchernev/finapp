import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createBank, getBanks } from "../controllers/bank.controller";
import { createBankValidators } from "../validators/bank.validators";

const router = Router();

router.use(authenticate);

router.get("/", getBanks);
router.post("/", createBankValidators, createBank);

export default router;
