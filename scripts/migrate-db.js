#!/usr/bin/env node

/**
 * Itineraries Database Migration Script
 * Handles database initialization and migrations for production deployment
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  try {
    log('🗄️  Starting database migration...', 'blue');

    // Ensure database directory exists
    const dbDir = path.join(__dirname, '../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      log('✅ Created database directory', 'green');
    }

    // Initialize database
    log('📋 Initializing database schema...', 'yellow');
    const db = require('../server/config/database');

    // Check if database has any tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    if (tables.length === 0) {
      log('🆕 Fresh database detected - initializing schema', 'green');
    } else {
      log(`📊 Found ${tables.length} existing tables`, 'yellow');
    }

    log('✅ Database initialization completed successfully!', 'green');
    
    // Display database info
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get();
    
    log('\n📈 Database Statistics:', 'blue');
    log(`   Users: ${userCount.count}`);
    log(`   Events: ${eventCount.count}`);
    log(`   Tables: ${tables.length}`);

    // Close database connection
    db.close();

  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  main();
}

module.exports = { main };