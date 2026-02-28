-- CreateTable
CREATE TABLE "Glossary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "term" TEXT NOT NULL,
    "pronunciation" TEXT,
    "category" TEXT NOT NULL DEFAULT '通用',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Glossary_term_key" ON "Glossary"("term");
