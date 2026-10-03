import { beforeEach } from "vitest";
import { MemoryStorage } from "./storage";
export const testStorage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: testStorage });
beforeEach(() => testStorage.clear());
