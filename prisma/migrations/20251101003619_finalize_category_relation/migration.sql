/*
  Warnings:

  - You are about to drop the column `category` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `categoryIcon` on the `Transaction` table. All the data in the column will be lost.
  - Made the column `id` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `categoryId` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Transaction` DROP FOREIGN KEY `Transaction_categoryId_fkey`;

-- DropIndex
DROP INDEX `Category_id_key` ON `Category`;

-- AlterTable
ALTER TABLE `Category` MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Transaction` DROP COLUMN `category`,
    DROP COLUMN `categoryIcon`,
    MODIFY `categoryId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
