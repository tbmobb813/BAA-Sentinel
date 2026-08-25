-- AlterTable
-- Fixes drift between the committed migration history and schema.prisma:
-- BaaRecord.label was added to the schema alongside the vendor document
-- upload feature, but no migration was ever generated for it.
ALTER TABLE "BaaRecord" ADD COLUMN "label" TEXT NOT NULL DEFAULT 'Untitled document';
