import { describe, it, expect } from "vitest";
import {
  getHizbAudioUrl,
  getThumunAudioUrl,
  thumunToHizbAndPos,
} from "./quran-audio";

describe("Quran Audio Service (Ahzab & Athman)", () => {
  it("computes hizb and pos correctly from thumunId", () => {
    expect(thumunToHizbAndPos(1)).toEqual({ hizb: 1, pos: 1 });
    expect(thumunToHizbAndPos(2)).toEqual({ hizb: 1, pos: 2 });
    expect(thumunToHizbAndPos(8)).toEqual({ hizb: 1, pos: 8 });
    expect(thumunToHizbAndPos(9)).toEqual({ hizb: 2, pos: 1 });
    expect(thumunToHizbAndPos(480)).toEqual({ hizb: 60, pos: 8 });
  });

  describe("Hizb Audio URLs (Khatma)", () => {
    it("generates correct URL for Al-Husary", () => {
      const url1 = getHizbAudioUrl("husary", 1);
      expect(url1).toBe("https://archive.org/download/06_20220525vvv/01.mp3");

      const url60 = getHizbAudioUrl("husary", 60);
      expect(url60).toBe("https://archive.org/download/06_20220525vvv/60.mp3");
    });

    it("generates correct URL for Abdul Basit", () => {
      const url1 = getHizbAudioUrl("abdulbasit", 1);
      expect(url1).toBe("https://archive.org/download/rabi3246234623632146234623462364/01.mp3");
    });

    it("generates correct URL for Benkiran", () => {
      const url1 = getHizbAudioUrl("benkiran", 1);
      expect(url1).toBe("https://archive.org/download/kirane2013/01.mp3");
    });
  });

  describe("Thumun Audio URLs (Hifz)", () => {
    it("generates correct URL for Mohamed Sayed", () => {
      expect(getThumunAudioUrl("sayed", 1)).toBe(
        "https://archive.org/download/hxxxxxxxxxz/H01-T01.mp3",
      );
      expect(getThumunAudioUrl("sayed", 2)).toBe(
        "https://archive.org/download/hxxxxxxxxxz/H01-T02.mp3",
      );
      expect(getThumunAudioUrl("sayed", 480)).toBe(
        "https://archive.org/download/hxxxxxxxxxz/H60-T08.mp3",
      );
    });

    it("generates correct URL for Abdelhamid Hassaine", () => {
      expect(getThumunAudioUrl("hassaine", 1)).toBe(
        "https://archive.org/download/vh-45-t-0v4v/H01_T01.mp3",
      );
    });

    it("generates correct URL for Al-Qazabri Fast", () => {
      expect(getThumunAudioUrl("qazabri_fast", 1)).toBe(
        "https://archive.org/download/nhna-01-t-01nnna/H01_T01.mp3",
      );
    });

    it("generates correct URL for Mohamed Sayed Fast", () => {
      expect(getThumunAudioUrl("sayed_fast", 1)).toBe(
        "https://archive.org/download/z240405xxxz/H01-T01.mp3",
      );
    });

    it("generates correct URL for Benkiran Fast including special first thumun", () => {
      // First thumun has space encoded
      expect(getThumunAudioUrl("benkiran_fast", 1)).toBe(
        "https://archive.org/download/ssss435-8/01%201-8.mp3",
      );
      // Other thumuns follow {hizb}{thumun}-8.mp3
      expect(getThumunAudioUrl("benkiran_fast", 2)).toBe(
        "https://archive.org/download/ssss435-8/012-8.mp3",
      );
      expect(getThumunAudioUrl("benkiran_fast", 9)).toBe(
        "https://archive.org/download/ssss435-8/021-8.mp3",
      );
      expect(getThumunAudioUrl("benkiran_fast", 480)).toBe(
        "https://archive.org/download/ssss435-8/608-8.mp3",
      );
    });
  });
});
