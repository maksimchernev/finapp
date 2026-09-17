import { Prisma, PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import {
  addCreditCardBalance,
  createUserCreditCard,
  deleteCreditCardBalance,
  deleteUserCreditCard,
  getUserCreditCard,
  listUserCreditCards,
  updateCreditCardBalance,
  updateUserCreditCard,
} from "../services/credit-card.service";
import { moscowDate } from "../services/credit-card-reminders.service";

const prisma = new PrismaClient();

function handleError(error: unknown, res: Response) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ error: "На эту дату уже есть запись." });
    return;
  }
  console.error("Credit card error:", error);
  res.status(500).json({ error: "Не удалось сохранить данные карты." });
}

export async function listCreditCards(req: Request, res: Response) {
  try {
    res.json(await listUserCreditCards(prisma, req.user!.id, moscowDate()));
  } catch (error) { handleError(error, res); }
}

export async function createCreditCard(req: Request, res: Response) {
  try {
    res.status(201).json(await createUserCreditCard(prisma, req.user!.id, req.body));
  } catch (error) { handleError(error, res); }
}

export async function updateCreditCard(req: Request, res: Response) {
  try {
    const card = await updateUserCreditCard(prisma, req.user!.id, req.params.id, req.body);
    if (!card) { res.status(404).json({ error: "Карта не найдена." }); return; }
    res.json(card);
  } catch (error) { handleError(error, res); }
}

export async function deleteCreditCard(req: Request, res: Response) {
  try {
    if (!await deleteUserCreditCard(prisma, req.user!.id, req.params.id)) {
      res.status(404).json({ error: "Карта не найдена." }); return;
    }
    res.status(204).send();
  } catch (error) { handleError(error, res); }
}

export async function addBalance(req: Request, res: Response) {
  try {
    const balance = await addCreditCardBalance(prisma, req.user!.id, req.params.id, req.body.date, req.body.amountMinor);
    if (!balance) { res.status(404).json({ error: "Карта не найдена." }); return; }
    res.status(201).json({ id: balance.id, date: req.body.date, amountMinor: balance.amountMinor });
  } catch (error) { handleError(error, res); }
}

export async function updateBalance(req: Request, res: Response) {
  try {
    const balance = await updateCreditCardBalance(prisma, req.user!.id, req.params.id, req.params.balanceId, req.body.date, req.body.amountMinor);
    if (!balance) { res.status(404).json({ error: "Запись не найдена." }); return; }
    res.json({ id: balance.id, date: req.body.date, amountMinor: balance.amountMinor });
  } catch (error) { handleError(error, res); }
}

export async function deleteBalance(req: Request, res: Response) {
  try {
    if (!await deleteCreditCardBalance(prisma, req.user!.id, req.params.id, req.params.balanceId)) {
      res.status(404).json({ error: "Запись не найдена." }); return;
    }
    res.status(204).send();
  } catch (error) { handleError(error, res); }
}

export async function getCreditCard(req: Request, res: Response) {
  try {
    const card = await getUserCreditCard(prisma, req.user!.id, req.params.id);
    if (!card) { res.status(404).json({ error: "Карта не найдена." }); return; }
    res.json(card);
  } catch (error) { handleError(error, res); }
}
