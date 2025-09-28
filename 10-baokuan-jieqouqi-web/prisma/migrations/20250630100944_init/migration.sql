-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('URL', 'FILE', 'TEXT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisSource" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceContent" TEXT NOT NULL,
    "transcript" TEXT,
    "ownerId" TEXT NOT NULL,
    "mediaFileId" TEXT,

    CONSTRAINT "AnalysisSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisCard" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "versionTitle" TEXT NOT NULL,
    "hookCopy" TEXT,
    "hookTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hookNotes" TEXT,
    "coreIdea" TEXT,
    "argumentCase" TEXT,
    "valueDelivery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reusableElements" TEXT,
    "valueNotes" TEXT,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "AnalysisCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisSource_mediaFileId_key" ON "AnalysisSource"("mediaFileId");

-- AddForeignKey
ALTER TABLE "AnalysisSource" ADD CONSTRAINT "AnalysisSource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSource" ADD CONSTRAINT "AnalysisSource_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisCard" ADD CONSTRAINT "AnalysisCard_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "AnalysisSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
