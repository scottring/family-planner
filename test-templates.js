#!/usr/bin/env node

/**
 * Automated test suite for template functionality
 * Tests the complete workflow from creation to application
 */

const assert = require('assert');

const API_BASE = 'http://localhost:11001/api';
let authToken = null;
let testTemplateId = null;
let testEventId = null;

// Test configuration
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpass123'
};

const TEST_TEMPLATE = {
  name: 'Test Soccer Practice Template',
  category: 'preparation',
  phase: 'pre',
  icon: '⚽',
  description: 'Template for soccer practice preparation',
  items: [
    { text: 'Pack soccer cleats', category: 'equipment' },
    { text: 'Fill water bottles', category: 'hydration' },
    { text: 'Prepare snacks', category: 'nutrition' }
  ],
  estimated_time: 30,
  event_types: ['sports', 'soccer'],
  tags: ['youth', 'sports', 'preparation']
};

// Helper function to make authenticated requests
async function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
  
  const text = await response.text();
  
  // Try to parse as JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('Response is not JSON:', text.substring(0, 200));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }
    data = text;
  }
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }
  
  return data;
}

// Test 1: Login
async function testLogin() {
  console.log('🧪 Test 1: Login...');
  try {
    const response = await authFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    });
    
    authToken = response.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    // Try to register first
    console.log('📝 Attempting to register user...');
    try {
      await authFetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          ...TEST_USER,
          name: 'Test User'
        })
      });
      // Try login again
      const response = await authFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(TEST_USER)
      });
      authToken = response.token;
      console.log('✅ Registration and login successful');
      return true;
    } catch (regError) {
      console.error('❌ Registration failed:', regError.message);
      return false;
    }
  }
}

// Test 2: Fetch existing templates
async function testFetchTemplates() {
  console.log('🧪 Test 2: Fetch templates...');
  try {
    const templates = await authFetch(`${API_BASE}/templates`);
    console.log(`✅ Fetched ${templates.length} templates`);
    return true;
  } catch (error) {
    console.error('❌ Fetch templates failed:', error.message);
    return false;
  }
}

// Test 3: Create a new template
async function testCreateTemplate() {
  console.log('🧪 Test 3: Create template...');
  try {
    const template = await authFetch(`${API_BASE}/templates`, {
      method: 'POST',
      body: JSON.stringify(TEST_TEMPLATE)
    });
    
    testTemplateId = template.id;
    assert(template.name === TEST_TEMPLATE.name, 'Template name mismatch');
    assert(template.items.length === TEST_TEMPLATE.items.length, 'Items count mismatch');
    console.log(`✅ Template created with ID: ${testTemplateId}`);
    return true;
  } catch (error) {
    console.error('❌ Create template failed:', error.message);
    return false;
  }
}

// Test 4: Update template
async function testUpdateTemplate() {
  console.log('🧪 Test 4: Update template...');
  if (!testTemplateId) {
    console.log('⏭️  Skipping: No template ID');
    return false;
  }
  
  try {
    const updates = {
      name: 'Updated Soccer Template',
      items: [
        ...TEST_TEMPLATE.items,
        { text: 'Check weather', category: 'preparation' }
      ]
    };
    
    const template = await authFetch(`${API_BASE}/templates/${testTemplateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    assert(template.name === updates.name, 'Template name not updated');
    assert(template.items.length === 4, 'Items not updated correctly');
    console.log('✅ Template updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Update template failed:', error.message);
    return false;
  }
}

// Test 5: Get suggested templates
async function testSuggestedTemplates() {
  console.log('🧪 Test 5: Get suggested templates...');
  try {
    const suggestions = await authFetch(`${API_BASE}/templates/suggested/soccer?phase=pre`);
    console.log(`✅ Fetched ${suggestions.length} suggested templates`);
    return true;
  } catch (error) {
    console.error('❌ Get suggested templates failed:', error.message);
    return false;
  }
}

// Test 6: Create test event
async function testCreateEvent() {
  console.log('🧪 Test 6: Create test event...');
  try {
    const event = await authFetch(`${API_BASE}/events`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Soccer Practice',
        category: 'sports',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        location: 'Soccer Field'
      })
    });
    
    testEventId = event.id;
    console.log(`✅ Event created with ID: ${testEventId}`);
    return true;
  } catch (error) {
    console.error('❌ Create event failed:', error.message);
    return false;
  }
}

// Test 7: Apply template to event
async function testApplyTemplate() {
  console.log('🧪 Test 7: Apply template to event...');
  if (!testTemplateId || !testEventId) {
    console.log('⏭️  Skipping: Missing template or event ID');
    return false;
  }
  
  try {
    const result = await authFetch(`${API_BASE}/templates/${testTemplateId}/apply`, {
      method: 'POST',
      body: JSON.stringify({
        event_id: testEventId,
        phase: 'pre'
      })
    });
    
    assert(result.success === true, 'Template application failed');
    console.log('✅ Template applied to event successfully');
    return true;
  } catch (error) {
    console.error('❌ Apply template failed:', error.message);
    return false;
  }
}

// Test 8: Submit feedback
async function testSubmitFeedback() {
  console.log('🧪 Test 8: Submit feedback...');
  if (!testTemplateId) {
    console.log('⏭️  Skipping: No template ID');
    return false;
  }
  
  try {
    const result = await authFetch(`${API_BASE}/templates/${testTemplateId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        application_id: 1, // Assuming first application
        completion_rate: 0.8,
        feedback_score: 4,
        notes: 'Template worked well',
        time_taken_minutes: 25
      })
    });
    
    console.log('✅ Feedback submitted successfully');
    return true;
  } catch (error) {
    console.error('❌ Submit feedback failed:', error.message);
    return false;
  }
}

// Test 9: Get statistics
async function testGetStatistics() {
  console.log('🧪 Test 9: Get template statistics...');
  try {
    const stats = await authFetch(`${API_BASE}/templates/statistics`);
    console.log('✅ Statistics retrieved:', {
      totalTemplates: stats.total_templates,
      totalApplications: stats.total_applications
    });
    return true;
  } catch (error) {
    console.error('❌ Get statistics failed:', error.message);
    return false;
  }
}

// Test 10: Delete template
async function testDeleteTemplate() {
  console.log('🧪 Test 10: Delete template...');
  if (!testTemplateId) {
    console.log('⏭️  Skipping: No template ID');
    return false;
  }
  
  try {
    const result = await authFetch(`${API_BASE}/templates/${testTemplateId}`, {
      method: 'DELETE'
    });
    
    console.log('✅ Template deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Delete template failed:', error.message);
    return false;
  }
}

// Cleanup: Delete test event
async function cleanup() {
  console.log('🧹 Cleaning up...');
  if (testEventId) {
    try {
      await authFetch(`${API_BASE}/events/${testEventId}`, {
        method: 'DELETE'
      });
      console.log('✅ Test event deleted');
    } catch (error) {
      console.error('⚠️  Could not delete test event:', error.message);
    }
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Template API Tests');
  console.log('================================\n');
  
  const tests = [
    testLogin,
    testFetchTemplates,
    testCreateTemplate,
    testUpdateTemplate,
    testSuggestedTemplates,
    testCreateEvent,
    testApplyTemplate,
    testSubmitFeedback,
    testGetStatistics,
    testDeleteTemplate
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) passed++;
    else failed++;
    console.log(''); // Add spacing between tests
  }
  
  await cleanup();
  
  console.log('\n================================');
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round(passed / tests.length * 100)}%`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (response.ok) {
      console.log('✅ Server is running on port 11001\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running on port 11001');
    console.error('Please start the server first: npm start');
    return false;
  }
}

// Main execution
(async () => {
  if (await checkServer()) {
    await runTests();
  } else {
    process.exit(1);
  }
})();