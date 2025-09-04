const db = require('../config/database');

const logisticsTemplates = [
  {
    name: 'Soccer Practice',
    activity_type: 'soccer',
    packing_list: JSON.stringify(['Soccer cleats', 'Shin guards', 'Water bottle', 'Towel', 'Extra shirt', 'Snacks']),
    default_parking_info: 'Park in the main lot near the field entrance. Additional overflow parking available on weekends.',
    contacts: JSON.stringify([
      { name: 'Coach Mike', phone: '555-0123', role: 'Head Coach' },
      { name: 'Team Manager Lisa', phone: '555-0124', role: 'Team Manager' }
    ]),
    weather_dependent: true,
    meal_requirements: JSON.stringify({ bring_snacks: true, notes: 'Energy bars and electrolyte drinks recommended' }),
    season: 'fall'
  },
  {
    name: 'Soccer Game',
    activity_type: 'soccer',
    packing_list: JSON.stringify(['Soccer cleats', 'Shin guards', 'Water bottle', 'Towel', 'Team jersey', 'Snacks', 'Camera', 'Folding chair']),
    default_parking_info: 'Arrive early for games. Parking fills up quickly. Consider carpooling.',
    contacts: JSON.stringify([
      { name: 'Coach Mike', phone: '555-0123', role: 'Head Coach' },
      { name: 'Team Manager Lisa', phone: '555-0124', role: 'Team Manager' },
      { name: 'Referee Coordinator', phone: '555-0125', role: 'Official Contact' }
    ]),
    weather_dependent: true,
    meal_requirements: JSON.stringify({ bring_snacks: true, notes: 'Post-game snacks for the team if home game' }),
    season: 'fall'
  },
  {
    name: 'Swimming Practice',
    activity_type: 'swimming',
    packing_list: JSON.stringify(['Swimsuit', 'Goggles', 'Swim cap', 'Towel', 'Water bottle', 'Flip flops', 'Shampoo']),
    default_parking_info: 'Free parking in the aquatic center lot. Enter through the main entrance.',
    contacts: JSON.stringify([
      { name: 'Coach Sarah', phone: '555-0201', role: 'Swim Coach' },
      { name: 'Pool Manager', phone: '555-0202', role: 'Facility Contact' }
    ]),
    weather_dependent: false,
    meal_requirements: JSON.stringify({ notes: 'No eating 1 hour before practice' }),
    season: null
  },
  {
    name: 'Swimming Meet',
    activity_type: 'swimming',
    packing_list: JSON.stringify(['Swimsuit', 'Goggles', 'Swim cap', 'Multiple towels', 'Water bottle', 'Snacks', 'Timing watch', 'Team shirt', 'Sunscreen', 'Folding chair']),
    default_parking_info: 'Competition parking may be limited. Plan to arrive 1+ hours early for warm-ups.',
    contacts: JSON.stringify([
      { name: 'Coach Sarah', phone: '555-0201', role: 'Swim Coach' },
      { name: 'Meet Director', phone: '555-0203', role: 'Event Coordinator' },
      { name: 'Team Parent Coordinator', phone: '555-0204', role: 'Parent Liaison' }
    ]),
    weather_dependent: false,
    meal_requirements: JSON.stringify({ 
      bring_snacks: true, 
      bring_lunch: true,
      notes: 'Meets are long. Pack healthy snacks and lunch. No eating 30 mins before events.' 
    }),
    season: null
  },
  {
    name: 'School Event',
    activity_type: 'school',
    packing_list: JSON.stringify(['School supplies', 'Water bottle', 'Snack', 'Permission slip', 'Emergency contact info']),
    default_parking_info: 'Use visitor parking near the main office. Sign in at the front desk.',
    contacts: JSON.stringify([
      { name: 'Main Office', phone: '555-0301', role: 'School Office' },
      { name: 'Teacher', phone: '555-0302', role: 'Classroom Teacher' }
    ]),
    weather_dependent: false,
    meal_requirements: JSON.stringify({ notes: 'Check if lunch is provided or needs to be brought' }),
    season: null
  },
  {
    name: 'Doctor Appointment',
    activity_type: 'medical',
    packing_list: JSON.stringify(['Insurance card', 'ID', 'Medication list', 'Previous records', 'List of questions', 'Payment method']),
    default_parking_info: 'Validate parking ticket at the front desk. Some locations offer valet service.',
    contacts: JSON.stringify([
      { name: 'Dr. Office', phone: '555-0401', role: 'Medical Office' },
      { name: 'Insurance', phone: '555-0402', role: 'Insurance Provider' }
    ]),
    weather_dependent: false,
    meal_requirements: JSON.stringify({ notes: 'Check if fasting is required before appointment' }),
    season: null
  },
  {
    name: 'Beach Trip',
    activity_type: 'outdoor',
    packing_list: JSON.stringify(['Sunscreen', 'Towels', 'Water bottles', 'Snacks', 'Beach umbrella', 'Cooler', 'Beach toys', 'First aid kit', 'Flip flops', 'Hat']),
    default_parking_info: 'Beach parking can be limited on weekends. Consider arriving early or using public transport.',
    contacts: JSON.stringify([
      { name: 'Beach Lifeguard', phone: '555-0501', role: 'Beach Safety' }
    ]),
    weather_dependent: true,
    meal_requirements: JSON.stringify({ 
      bring_lunch: true, 
      bring_snacks: true,
      notes: 'Keep food cool and hydrate frequently in the sun' 
    }),
    season: 'summer'
  },
  {
    name: 'Birthday Party',
    activity_type: 'party',
    packing_list: JSON.stringify(['Gift', 'Card', 'Camera', 'Wet wipes', 'Change of clothes', 'Thank you cards']),
    default_parking_info: 'Street parking or check with host for parking instructions.',
    contacts: JSON.stringify([
      { name: 'Party Host', phone: '555-0601', role: 'Host Parent' }
    ]),
    weather_dependent: false,
    meal_requirements: JSON.stringify({ notes: 'Check with host about food allergies and meal timing' }),
    season: null
  }
];

function seedLogisticsTemplates() {
  console.log('Seeding logistics templates...');
  
  // Clear existing templates
  db.prepare('DELETE FROM logistics_templates').run();
  console.log('Cleared existing logistics templates');

  // Insert new templates
  const insertTemplate = db.prepare(`
    INSERT INTO logistics_templates (
      name, activity_type, packing_list, default_parking_info, 
      contacts, weather_dependent, meal_requirements, season, usage_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  logisticsTemplates.forEach(template => {
    insertTemplate.run(
      template.name,
      template.activity_type,
      template.packing_list,
      template.default_parking_info,
      template.contacts,
      template.weather_dependent ? 1 : 0, // Convert boolean to integer
      template.meal_requirements,
      template.season,
      Math.floor(Math.random() * 10) // Random usage count for demo
    );
    console.log(`Inserted template: ${template.name}`);
  });

  console.log(`Successfully seeded ${logisticsTemplates.length} logistics templates`);
}

// Run the seeding
if (require.main === module) {
  seedLogisticsTemplates();
}

module.exports = { seedLogisticsTemplates };