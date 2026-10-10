/*
  Warnings:

  - You are about to alter the column `referenceHigh` on the `LabResult` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `referenceLow` on the `LabResult` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `value` on the `LabResult` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LabResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "referenceLow" REAL,
    "referenceHigh" REAL,
    "collectedAt" DATETIME NOT NULL,
    "flag" TEXT NOT NULL,
    CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LabResult" ("collectedAt", "flag", "id", "patientId", "referenceHigh", "referenceLow", "testCode", "unit", "value") SELECT "collectedAt", "flag", "id", "patientId", "referenceHigh", "referenceLow", "testCode", "unit", "value" FROM "LabResult";
DROP TABLE "LabResult";
ALTER TABLE "new_LabResult" RENAME TO "LabResult";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
