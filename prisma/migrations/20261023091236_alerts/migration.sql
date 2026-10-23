-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "propertyId" TEXT,
    "dueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    "snoozedTill" DATETIME,
    "dismissedAt" DATETIME,
    "resolvedAt" DATETIME,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remindTaskDays" INTEGER NOT NULL DEFAULT 7,
    "remindWarrantyDays" INTEGER NOT NULL DEFAULT 30,
    "remindLifeMonths" INTEGER NOT NULL DEFAULT 12
);
INSERT INTO "new_User" ("createdAt", "email", "googleId", "id", "name", "passwordHash", "useCase") SELECT "createdAt", "email", "googleId", "id", "name", "passwordHash", "useCase" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Alert_userId_resolvedAt_dismissedAt_idx" ON "Alert"("userId", "resolvedAt", "dismissedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_userId_key_key" ON "Alert"("userId", "key");
