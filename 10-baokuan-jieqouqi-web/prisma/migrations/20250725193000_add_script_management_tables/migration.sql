-- CreateEnum
CREATE TYPE "baokuan_app"."ScriptStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "baokuan_app"."ScriptSectionType" AS ENUM ('HOOK', 'PROBLEM', 'SOLUTION', 'PROOF', 'CTA');

-- CreateEnum
CREATE TYPE "baokuan_app"."ImportanceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "baokuan_app"."EditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'GENERATE');

-- CreateTable
CREATE TABLE "baokuan_app"."scripts" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" "baokuan_app"."ScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cardId" TEXT,
    "sourceId" TEXT,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baokuan_app"."script_sections" (
    "id" TEXT NOT NULL,
    "sectionType" "baokuan_app"."ScriptSectionType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "tips" JSONB NOT NULL DEFAULT '[]',
    "timeRange" VARCHAR(50),
    "importance" "baokuan_app"."ImportanceLevel" NOT NULL DEFAULT 'MEDIUM',
    "orderIndex" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scriptId" TEXT NOT NULL,

    CONSTRAINT "script_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baokuan_app"."script_edit_history" (
    "id" TEXT NOT NULL,
    "contentBefore" TEXT,
    "contentAfter" TEXT,
    "action" "baokuan_app"."EditAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scriptId" TEXT NOT NULL,
    "sectionId" TEXT,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "script_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_fileHash_key" ON "baokuan_app"."MediaFile"("fileHash");

-- CreateIndex
CREATE INDEX "scripts_cardId_idx" ON "baokuan_app"."scripts"("cardId");

-- CreateIndex
CREATE INDEX "scripts_sourceId_idx" ON "baokuan_app"."scripts"("sourceId");

-- CreateIndex
CREATE INDEX "scripts_creatorId_idx" ON "baokuan_app"."scripts"("creatorId");

-- CreateIndex
CREATE INDEX "scripts_status_idx" ON "baokuan_app"."scripts"("status");

-- CreateIndex
CREATE INDEX "scripts_createdAt_idx" ON "baokuan_app"."scripts"("createdAt");

-- CreateIndex
CREATE INDEX "scripts_updatedAt_idx" ON "baokuan_app"."scripts"("updatedAt");

-- CreateIndex
CREATE INDEX "script_sections_scriptId_idx" ON "baokuan_app"."script_sections"("scriptId");

-- CreateIndex
CREATE INDEX "script_sections_sectionType_idx" ON "baokuan_app"."script_sections"("sectionType");

-- CreateIndex
CREATE INDEX "script_sections_scriptId_orderIndex_idx" ON "baokuan_app"."script_sections"("scriptId", "orderIndex");

-- CreateIndex
CREATE INDEX "script_sections_updatedAt_idx" ON "baokuan_app"."script_sections"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uk_script_sections_script_type" ON "baokuan_app"."script_sections"("scriptId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "uk_script_sections_script_order" ON "baokuan_app"."script_sections"("scriptId", "orderIndex");

-- CreateIndex
CREATE INDEX "script_edit_history_scriptId_idx" ON "baokuan_app"."script_edit_history"("scriptId");

-- CreateIndex
CREATE INDEX "script_edit_history_sectionId_idx" ON "baokuan_app"."script_edit_history"("sectionId");

-- CreateIndex
CREATE INDEX "script_edit_history_creatorId_idx" ON "baokuan_app"."script_edit_history"("creatorId");

-- CreateIndex
CREATE INDEX "script_edit_history_createdAt_idx" ON "baokuan_app"."script_edit_history"("createdAt");

-- CreateIndex
CREATE INDEX "script_edit_history_action_idx" ON "baokuan_app"."script_edit_history"("action");

-- AddForeignKey
ALTER TABLE "baokuan_app"."scripts" ADD CONSTRAINT "scripts_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "baokuan_app"."AnalysisCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baokuan_app"."scripts" ADD CONSTRAINT "scripts_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "baokuan_app"."AnalysisSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baokuan_app"."scripts" ADD CONSTRAINT "scripts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "baokuan_app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baokuan_app"."script_sections" ADD CONSTRAINT "script_sections_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "baokuan_app"."scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baokuan_app"."script_edit_history" ADD CONSTRAINT "script_edit_history_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "baokuan_app"."scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baokuan_app"."script_edit_history" ADD CONSTRAINT "script_edit_history_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "baokuan_app"."script_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baokuan_app"."script_edit_history" ADD CONSTRAINT "script_edit_history_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "baokuan_app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;