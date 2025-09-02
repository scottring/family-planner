const db = require('../config/database');

const defaultTemplates = [
  {
    name: 'Soccer Practice',
    category: 'Sports',
    description: 'Everything needed for soccer practice',
    items: [
      'Soccer ball',
      'Cleats',
      'Shin guards',
      'Water bottle',
      'Practice jersey',
      'Socks',
      'Snack for after practice',
      'Sunscreen',
      'Hair ties/headband',
      'Small towel'
    ],
    tags: ['sports', 'outdoor', 'kids', 'weekly']
  },
  {
    name: 'Beach Day',
    category: 'Recreation',
    description: 'Complete packing list for a fun day at the beach',
    items: [
      'Sunscreen (SPF 30+)',
      'Beach towels',
      'Swimwear',
      'Beach umbrella or tent',
      'Cooler with ice',
      'Water bottles',
      'Snacks and lunch',
      'Beach toys (buckets, shovels)',
      'Flip flops or water shoes',
      'Change of clothes',
      'Waterproof phone case',
      'Beach chairs',
      'First aid kit',
      'Trash bags',
      'Cash for parking'
    ],
    tags: ['outdoor', 'family', 'summer', 'recreation']
  },
  {
    name: 'Doctor Visit',
    category: 'Healthcare',
    description: 'Preparation checklist for medical appointments',
    items: [
      'Insurance card',
      'Photo ID',
      'List of current medications',
      'Medical history records',
      'List of questions for doctor',
      'Previous test results',
      'Referral letter (if applicable)',
      'Payment method for copay',
      'Emergency contact information',
      'Symptom diary (if applicable)'
    ],
    tags: ['healthcare', 'medical', 'appointment', 'important']
  },
  {
    name: 'School Field Trip',
    category: 'Education',
    description: 'What kids need for school field trips',
    items: [
      'Permission slip (signed)',
      'Lunch money or packed lunch',
      'Water bottle',
      'Comfortable walking shoes',
      'Weather-appropriate clothing',
      'Small backpack',
      'Emergency contact card',
      'Any required medications',
      'Camera or phone (if allowed)',
      'Notebook and pen',
      'Hand sanitizer',
      'Small snack'
    ],
    tags: ['school', 'education', 'kids', 'trip']
  },
  {
    name: 'Airplane Travel',
    category: 'Travel',
    description: 'Essential items for air travel',
    items: [
      'Valid ID or passport',
      'Boarding passes',
      'Travel insurance documents',
      'Chargers for devices',
      'Entertainment (books, tablets)',
      'Snacks',
      'Empty water bottle',
      'Travel-sized toiletries',
      'Comfortable clothes',
      'Travel pillow',
      'Eye mask and earplugs',
      'Medications in carry-on',
      'Important documents (copies)',
      'Credit cards and cash',
      'Travel adapter (international)',
      'Hand sanitizer',
      'Face mask',
      'Gum or candy for takeoff/landing'
    ],
    tags: ['travel', 'airplane', 'vacation', 'important']
  }
];

function seedChecklists() {
  console.log('Seeding checklist templates...');
  
  try {
    // Check if templates already exist
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM checklist_templates').get();
    
    if (existingCount.count > 0) {
      console.log(`Found ${existingCount.count} existing templates. Skipping seed.`);
      return;
    }
    
    const insertStmt = db.prepare(`
      INSERT INTO checklist_templates (name, category, description, items, tags)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    let inserted = 0;
    
    for (const template of defaultTemplates) {
      try {
        insertStmt.run(
          template.name,
          template.category,
          template.description,
          JSON.stringify(template.items),
          JSON.stringify(template.tags)
        );
        inserted++;
        console.log(`✓ Created template: ${template.name}`);
      } catch (error) {
        console.error(`✗ Failed to create template ${template.name}:`, error.message);
      }
    }
    
    console.log(`Successfully seeded ${inserted} checklist templates.`);
    
  } catch (error) {
    console.error('Error seeding checklist templates:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedChecklists();
  process.exit(0);
}

module.exports = { seedChecklists };