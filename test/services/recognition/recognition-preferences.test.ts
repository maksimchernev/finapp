import assert from "node:assert/strict";
import test from "node:test";
import { getRecognitionPreferenceError } from "../../../src/services/recognition.service";

test("AI preference requires test access and explicit consent", () => {
  assert.equal(getRecognitionPreferenceError("ai", true, false), "AI доступен только тестовым аккаунтам");
  assert.equal(getRecognitionPreferenceError("ai", null, true), "Подтвердите передачу скриншотов в OpenAI");
  assert.equal(getRecognitionPreferenceError("ai", true, true), null);
});

test("local recognition is always available and preference values are validated", () => {
  assert.equal(getRecognitionPreferenceError("tesseract", false, false), null);
  assert.equal(getRecognitionPreferenceError("other", true, true), "Неизвестный метод распознавания");
  assert.equal(getRecognitionPreferenceError(undefined, false, false), null);
  assert.equal(getRecognitionPreferenceError(undefined, "true", true), "Некорректное согласие на AI");
});
