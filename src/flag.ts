import { z } from "zod";

const flagEnum = z.enum(["NORMAL", "HIGH", "LOW", "UNKNOWN"]);

type Flag = z.infer<typeof flagEnum>;

function calculateFlag(
  value: number,
  referenceLow?: number,
  referenceHigh?: number,
): Flag {
  if (referenceLow === undefined && referenceHigh === undefined) {
    return flagEnum.enum.UNKNOWN;
  }
  if (referenceHigh !== undefined && value > referenceHigh) {
    return flagEnum.enum.HIGH;
  }
  if (referenceLow !== undefined && value < referenceLow) {
    return flagEnum.enum.LOW;
  }
  return flagEnum.enum.NORMAL;
}

function isAbnormal(flag: Flag): boolean {
  if (
    flag === flagEnum.enum.HIGH ||
    flag === flagEnum.enum.LOW ||
    flag === flagEnum.enum.UNKNOWN
  ) {
    return true;
  }
  return false;
}

export { calculateFlag, flagEnum, isAbnormal };
