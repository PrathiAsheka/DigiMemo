-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "useCase" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remindTaskDays" INTEGER NOT NULL DEFAULT 7,
    "remindWarrantyDays" INTEGER NOT NULL DEFAULT 30,
    "remindLifeMonths" INTEGER NOT NULL DEFAULT 12
);
INSERT INTO "new_User" ("createdAt", "email", "googleId", "id", "name", "passwordHash", "remindLifeMonths", "remindTaskDays", "remindWarrantyDays", "useCase") SELECT "createdAt", "email", "googleId", "id", "name", "passwordHash", "remindLifeMonths", "remindTaskDays", "remindWarrantyDays", "useCase" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
