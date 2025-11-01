import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting category data migration...');

  // Step 1: Generate IDs for all categories that don't have one
  console.log('\nStep 1: Generating IDs for categories...');
  const categoriesWithoutId = await prisma.category.findMany({
    where: {
      id: null,
    },
  });
  
  console.log(`Found ${categoriesWithoutId.length} categories without ID`);
  
  for (const category of categoriesWithoutId) {
    const newId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await prisma.category.update({
      where: {
        name_userId_type: {
          name: category.name,
          userId: category.userId,
          type: category.type,
        },
      },
      data: {
        id: newId,
      },
    });
  }
  
  console.log(`✓ Generated ${categoriesWithoutId.length} category IDs`);

  // Step 2: Link transactions to categories
  console.log('\nStep 2: Linking transactions to categories...');
  
  // Get all transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      categoryId: null,
    },
    select: {
      id: true,
      category: true,
      userId: true,
    },
  });

  console.log(`Found ${transactions.length} transactions to migrate`);

  // Get all categories (now with IDs)
  const categories = await prisma.category.findMany();
  
  console.log(`Found ${categories.length} categories`);

  let updated = 0;
  let notFound = 0;
  const unmatchedCategories = new Set<string>();

  for (const transaction of transactions) {
    if (!transaction.category) {
      notFound++;
      continue;
    }
    
    // Find matching category for this user
    const userCategories = categories.filter(c => c.userId === transaction.userId);
    let category = userCategories.find(c => c.name === transaction.category);
    
    // If exact match not found, try fuzzy matching
    if (!category) {
      category = userCategories.find(c => {
        const catName = c.name.toLowerCase();
        const transName = transaction.category!.toLowerCase();
        
        // Exact match (case insensitive)
        if (catName === transName) return true;
        
        // Check if one is plural of the other (simple check for Croatian/English)
        if (catName + 'i' === transName || catName === transName + 'i') return true;
        if (catName + 's' === transName || catName === transName + 's') return true;
        
        return false;
      });
    }
    
    if (category) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { categoryId: category.id },
      });
      updated++;
    } else {
      notFound++;
      unmatchedCategories.add(`${transaction.category} (user: ${transaction.userId})`);
    }
  }  console.log(`\nMigration complete!`);
  console.log(`✓ Updated: ${updated} transactions`);
  console.log(`✗ Not found: ${notFound} transactions`);
  
  if (unmatchedCategories.size > 0) {
    console.log(`\nUnmatched categories:`);
    unmatchedCategories.forEach((cat) => console.log(`  - ${cat}`));
    
    // Show what categories DO exist for affected users
    console.log('\n--- Checking available categories for affected users ---');
    const userMatches = Array.from(unmatchedCategories).map(str => {
      const match = str.match(/\(user: (.+)\)/);
      return match ? match[1] : null;
    }).filter((id): id is string => id !== null);
    
    const affectedUsers = Array.from(new Set(userMatches));
    for (const userId of affectedUsers) {
      const userCategories = await prisma.category.findMany({
        where: { userId },
        select: { name: true, type: true }
      });
      console.log(`\nUser ${userId} has ${userCategories.length} categories:`);
      userCategories.forEach(cat => console.log(`  - ${cat.name} (${cat.type})`));
    }
  }
}

main()
  .catch((e) => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
