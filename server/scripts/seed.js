const bcrypt = require('bcryptjs');
const db = require('../config/database');

function seedDatabase() {
  console.log('Seeding database...');
  
  // Create default users (Scott and Iris)
  const scottPassword = bcrypt.hashSync('changeme123', 10);
  const irisPassword = bcrypt.hashSync('changeme456', 10);
  
  try {
    // Add Scott
    db.prepare(`
      INSERT OR IGNORE INTO users (username, password_hash, full_name, preferences)
      VALUES (?, ?, ?, ?)
    `).run('scott', scottPassword, 'Scott Kaufman', '{}');
    
    // Add Iris
    db.prepare(`
      INSERT OR IGNORE INTO users (username, password_hash, full_name, preferences)
      VALUES (?, ?, ?, ?)
    `).run('iris', irisPassword, 'Iris Kaufman', '{}');
    
    // Add family members
    const familyMembers = [
      { name: 'Kaleb', type: 'child', birth_date: '2017-01-01' },
      { name: 'Ella', type: 'child', birth_date: '2017-01-01' },
      { name: 'Dog', type: 'pet', birth_date: null }
    ];
    
    familyMembers.forEach(member => {
      db.prepare(`
        INSERT OR IGNORE INTO family_members (name, type, birth_date, dietary_preferences, health_goals)
        VALUES (?, ?, ?, ?, ?)
      `).run(member.name, member.type, member.birth_date, '{}', '{}');
    });
    
    // Add activity templates
    const templates = [
      {
        name: 'Soccer Practice',
        category: 'sports',
        default_duration: 90,
        preparation_items: JSON.stringify([
          'Soccer uniform (clean)',
          'Cleats',
          'Shin guards',
          'Soccer ball',
          'Water bottle (filled)',
          'Healthy snack',
          'Sunscreen'
        ]),
        equipment_list: JSON.stringify(['Soccer bag', 'Camp chair for parent'])
      },
      {
        name: 'School Day',
        category: 'education',
        default_duration: 420,
        preparation_items: JSON.stringify([
          'Backpack',
          'Homework (completed)',
          'Lunch/lunch money',
          'Water bottle',
          'Library books (if library day)',
          'PE clothes (if PE day)'
        ]),
        equipment_list: JSON.stringify(['School supplies', 'Chromebook (charged)'])
      }
    ];
    
    templates.forEach(template => {
      db.prepare(`
        INSERT OR IGNORE INTO activity_templates 
        (name, category, default_duration, preparation_items, equipment_list)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        template.name,
        template.category,
        template.default_duration,
        template.preparation_items,
        template.equipment_list
      );
    });
    
    console.log('Database seeded successfully!');
    console.log('Default users:');
    console.log('  Username: scott, Password: changeme123');
    console.log('  Username: iris, Password: changeme456');
    console.log('Please change these passwords after first login!');
    
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
  process.exit(0);
}

module.exports = seedDatabase;