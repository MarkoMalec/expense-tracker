-- AlterTable
ALTER TABLE `UserSettings` ADD COLUMN `billingCycleDay` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `preferredView` VARCHAR(191) NOT NULL DEFAULT 'calendar';
