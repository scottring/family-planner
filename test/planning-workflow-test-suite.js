/**
 * Comprehensive Test Suite for Weekly Planning Workflow
 * Tests all aspects of the planning session including:
 * - Session creation and initialization
 * - Real-time collaboration features
 * - Task creation and assignment
 * - Analytics and review features
 * - Error handling and edge cases
 */

const assert = require('assert');
const axios = require('axios');
const io = require('socket.io-client');
const Database = require('better-sqlite3');
const path = require('path');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:11001/api';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:11001';
const TEST_DB_PATH = path.join(__dirname, '../database/test.db');

// Test data
const testUsers = [
  { id: 1, username: 'scott', role: 'parent', family_id: 1 },
  { id: 2, username: 'partner', role: 'parent', family_id: 1 },
  { id: 3, username: 'child1', role: 'child', family_id: 1 }
];

const testAuthToken = 'test-auth-token-123';

class PlanningWorkflowTestSuite {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${testAuthToken}`,
        'Content-Type': 'application/json'
      }
    });
    this.socket = null;
    this.db = null;
    this.testResults = [];
    this.currentSessionId = null;
  }

  async setup() {
    console.log('🔧 Setting up test environment...');
    // Initialize test database
    this.db = new Database(TEST_DB_PATH);
    await this.initializeTestData();
  }

  async teardown() {
    console.log('🧹 Cleaning up test environment...');
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.db) {
      this.db.close();
    }
  }

  async initializeTestData() {
    // Create test tables and data
    // This would normally be done by the main database initialization
    console.log('📊 Initializing test data...');
  }

  // Test Suite Categories
  async runAllTests() {
    console.log('🚀 Starting Weekly Planning Workflow Test Suite\n');
    
    const testCategories = [
      { name: 'Session Lifecycle', tests: this.sessionLifecycleTests.bind(this) },
      { name: 'Real-time Collaboration', tests: this.realtimeCollaborationTests.bind(this) },
      { name: 'Task Management', tests: this.taskManagementTests.bind(this) },
      { name: 'Analytics & Review', tests: this.analyticsTests.bind(this) },
      { name: 'Error Handling', tests: this.errorHandlingTests.bind(this) },
      { name: 'UI/UX Workflow', tests: this.uiWorkflowTests.bind(this) },
      { name: 'Performance', tests: this.performanceTests.bind(this) }
    ];

    for (const category of testCategories) {
      console.log(`\n📋 Testing: ${category.name}`);
      console.log('─'.repeat(50));
      try {
        await category.tests();
      } catch (error) {
        this.recordFailure(category.name, 'Category failed', error);
      }
    }

    this.printTestResults();
  }

  // 1. Session Lifecycle Tests
  async sessionLifecycleTests() {
    await this.test('Create new planning session', async () => {
      const response = await this.api.post('/planning-session', {
        settings: {
          duration_minutes: 30,
          focus_areas: ['events', 'tasks', 'meals'],
          participants: [1, 2]
        }
      });
      
      assert(response.status === 201, 'Session should be created');
      assert(response.data.id, 'Session should have an ID');
      assert(response.data.status === 'active', 'Session should be active');
      this.currentSessionId = response.data.id;
    });

    await this.test('Load existing session', async () => {
      const response = await this.api.get(`/planning-session/${this.currentSessionId}`);
      assert(response.status === 200, 'Should load session');
      assert(response.data.id === this.currentSessionId, 'Should return correct session');
    });

    await this.test('Get latest session', async () => {
      const response = await this.api.get('/planning-session/latest');
      assert(response.status === 200, 'Should get latest session');
      assert(response.data.id === this.currentSessionId, 'Should return most recent session');
    });

    await this.test('Update session progress', async () => {
      const response = await this.api.put(`/planning-session/${this.currentSessionId}/progress`, {
        quadrant: 'events',
        completed: true
      });
      assert(response.status === 200, 'Should update progress');
      assert(response.data.progress.events === true, 'Events should be marked complete');
    });

    await this.test('Complete planning session', async () => {
      const response = await this.api.post(`/planning-session/${this.currentSessionId}/complete`);
      assert(response.status === 200, 'Should complete session');
      assert(response.data.status === 'completed', 'Session status should be completed');
      assert(response.data.end_time, 'Should have end time');
    });

    await this.test('Handle session timeout', async () => {
      // Create session with 1 second timeout for testing
      const response = await this.api.post('/planning-session', {
        settings: { duration_minutes: 0.016 } // ~1 second
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checkResponse = await this.api.get(`/planning-session/${response.data.id}`);
      assert(checkResponse.data.status === 'completed', 'Session should auto-complete after timeout');
    });
  }

  // 2. Real-time Collaboration Tests
  async realtimeCollaborationTests() {
    await this.test('Connect to WebSocket', async () => {
      return new Promise((resolve, reject) => {
        this.socket = io(SOCKET_URL, {
          transports: ['websocket'],
          auth: { token: testAuthToken }
        });

        this.socket.on('connect', () => {
          assert(this.socket.connected, 'Socket should be connected');
          resolve();
        });

        this.socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });
    });

    await this.test('Join planning session room', async () => {
      return new Promise((resolve, reject) => {
        this.socket.emit('join-planning-session', this.currentSessionId);
        
        this.socket.once('joined-session', (data) => {
          assert(data.sessionId === this.currentSessionId, 'Should join correct session');
          resolve();
        });

        setTimeout(() => reject(new Error('Join session timeout')), 3000);
      });
    });

    await this.test('Broadcast task creation', async () => {
      return new Promise((resolve, reject) => {
        const testTask = {
          title: 'Test Task',
          assigned_to: 2,
          due_date: '2024-12-31'
        };

        this.socket.once('task-created', (data) => {
          assert(data.task.title === testTask.title, 'Task should be broadcast');
          resolve();
        });

        this.socket.emit('create-task', testTask);
        setTimeout(() => reject(new Error('Task broadcast timeout')), 3000);
      });
    });

    await this.test('Handle participant changes', async () => {
      return new Promise((resolve, reject) => {
        this.socket.once('participant-joined', (data) => {
          assert(data.userId, 'Should receive participant info');
          resolve();
        });

        // Simulate another user joining
        this.socket.emit('user-joined', { userId: 2 });
        setTimeout(() => reject(new Error('Participant change timeout')), 3000);
      });
    });
  }

  // 3. Task Management Tests
  async taskManagementTests() {
    await this.test('Create task during planning', async () => {
      const response = await this.api.post('/planning-session/tasks', {
        session_id: this.currentSessionId,
        title: 'Weekly grocery shopping',
        assigned_to: 1,
        due_date: '2024-12-25',
        category: 'errands'
      });
      
      assert(response.status === 201, 'Task should be created');
      assert(response.data.id, 'Task should have ID');
      assert(response.data.session_id === this.currentSessionId, 'Task should be linked to session');
    });

    await this.test('Bulk assign tasks', async () => {
      const tasks = [
        { title: 'Task 1', assigned_to: 1 },
        { title: 'Task 2', assigned_to: 2 },
        { title: 'Task 3', assigned_to: 1 }
      ];

      const response = await this.api.post('/planning-session/tasks/bulk', {
        session_id: this.currentSessionId,
        tasks
      });

      assert(response.status === 201, 'Tasks should be created');
      assert(response.data.created === 3, 'Should create all tasks');
    });

    await this.test('Reassign task', async () => {
      const createResponse = await this.api.post('/planning-session/tasks', {
        session_id: this.currentSessionId,
        title: 'Reassignable task',
        assigned_to: 1
      });

      const taskId = createResponse.data.id;

      const reassignResponse = await this.api.put(`/planning-session/tasks/${taskId}`, {
        assigned_to: 2
      });

      assert(reassignResponse.status === 200, 'Task should be reassigned');
      assert(reassignResponse.data.assigned_to === 2, 'Task should have new assignee');
    });

    await this.test('Get session tasks summary', async () => {
      const response = await this.api.get(`/planning-session/${this.currentSessionId}/summary`);
      
      assert(response.status === 200, 'Should get summary');
      assert(response.data.task_count >= 0, 'Should have task count');
      assert(response.data.by_assignee, 'Should have assignee breakdown');
      assert(response.data.by_category, 'Should have category breakdown');
    });
  }

  // 4. Analytics & Review Tests
  async analyticsTests() {
    await this.test('Get weekly analytics', async () => {
      const startDate = '2024-12-01';
      const endDate = '2024-12-31';
      
      const response = await this.api.get('/planning-session/analytics', {
        params: { start_date: startDate, end_date: endDate }
      });

      assert(response.status === 200, 'Should get analytics');
      assert(response.data.sessions, 'Should have sessions data');
      assert(response.data.tasks, 'Should have tasks data');
      assert(response.data.participation, 'Should have participation data');
    });

    await this.test('Get member-specific analytics', async () => {
      const response = await this.api.get('/planning-session/analytics', {
        params: {
          start_date: '2024-12-01',
          end_date: '2024-12-31',
          member_id: 1
        }
      });

      assert(response.status === 200, 'Should get member analytics');
      assert(response.data.member_stats, 'Should have member-specific stats');
    });

    await this.test('Review completed sessions', async () => {
      const response = await this.api.get('/planning-session/history', {
        params: { status: 'completed', limit: 10 }
      });

      assert(response.status === 200, 'Should get session history');
      assert(Array.isArray(response.data), 'Should return array of sessions');
    });

    await this.test('Export session data', async () => {
      const response = await this.api.get(`/planning-session/${this.currentSessionId}/export`);
      
      assert(response.status === 200, 'Should export session data');
      assert(response.data.session, 'Should include session info');
      assert(response.data.tasks, 'Should include tasks');
      assert(response.data.events, 'Should include events');
    });
  }

  // 5. Error Handling Tests
  async errorHandlingTests() {
    await this.test('Handle invalid session ID', async () => {
      try {
        await this.api.get('/planning-session/invalid-id');
        assert(false, 'Should throw error for invalid ID');
      } catch (error) {
        assert(error.response.status === 404, 'Should return 404');
      }
    });

    await this.test('Handle missing required fields', async () => {
      try {
        await this.api.post('/planning-session/tasks', {
          // Missing required fields
          title: 'Incomplete task'
        });
        assert(false, 'Should throw error for missing fields');
      } catch (error) {
        assert(error.response.status === 400, 'Should return 400');
        assert(error.response.data.message, 'Should have error message');
      }
    });

    await this.test('Handle concurrent session conflicts', async () => {
      // Try to create session while one is active
      const firstSession = await this.api.post('/planning-session', {
        settings: { duration_minutes: 30 }
      });

      try {
        await this.api.post('/planning-session', {
          settings: { duration_minutes: 30 }
        });
        assert(false, 'Should not allow concurrent sessions');
      } catch (error) {
        assert(error.response.status === 409, 'Should return conflict status');
      }

      // Clean up
      await this.api.post(`/planning-session/${firstSession.data.id}/complete`);
    });

    await this.test('Handle invalid date ranges', async () => {
      try {
        await this.api.get('/planning-session/analytics', {
          params: {
            start_date: '2024-12-31',
            end_date: '2024-12-01' // End before start
          }
        });
        assert(false, 'Should throw error for invalid date range');
      } catch (error) {
        assert(error.response.status === 400, 'Should return 400');
      }
    });
  }

  // 6. UI/UX Workflow Tests
  async uiWorkflowTests() {
    await this.test('Quadrant navigation flow', async () => {
      const quadrants = ['events', 'tasks', 'meals', 'prep'];
      const sessionId = this.currentSessionId;

      for (const quadrant of quadrants) {
        const response = await this.api.put(`/planning-session/${sessionId}/current-quadrant`, {
          quadrant
        });
        
        assert(response.status === 200, `Should navigate to ${quadrant}`);
        assert(response.data.current_quadrant === quadrant, 'Should update current quadrant');
      }
    });

    await this.test('Smart suggestions', async () => {
      const response = await this.api.get(`/planning-session/${this.currentSessionId}/suggestions`, {
        params: { quadrant: 'events' }
      });

      assert(response.status === 200, 'Should get suggestions');
      assert(Array.isArray(response.data), 'Should return array of suggestions');
    });

    await this.test('Template application', async () => {
      const response = await this.api.post(`/planning-session/${this.currentSessionId}/apply-template`, {
        template_id: 'weekly_routine',
        quadrant: 'tasks'
      });

      assert(response.status === 200, 'Should apply template');
      assert(response.data.applied_items, 'Should return applied items');
    });

    await this.test('Progress indicators', async () => {
      const response = await this.api.get(`/planning-session/${this.currentSessionId}/progress`);
      
      assert(response.status === 200, 'Should get progress');
      assert(typeof response.data.percentage === 'number', 'Should have percentage');
      assert(response.data.completed_quadrants, 'Should list completed quadrants');
      assert(response.data.remaining_time, 'Should show remaining time');
    });

    await this.test('Undo/redo functionality', async () => {
      // Create action
      const createResponse = await this.api.post('/planning-session/tasks', {
        session_id: this.currentSessionId,
        title: 'Task to undo'
      });
      
      const taskId = createResponse.data.id;

      // Undo
      const undoResponse = await this.api.post(`/planning-session/${this.currentSessionId}/undo`);
      assert(undoResponse.status === 200, 'Should undo action');

      // Verify task is gone
      try {
        await this.api.get(`/tasks/${taskId}`);
        assert(false, 'Task should be deleted');
      } catch (error) {
        assert(error.response.status === 404, 'Task should not exist');
      }

      // Redo
      const redoResponse = await this.api.post(`/planning-session/${this.currentSessionId}/redo`);
      assert(redoResponse.status === 200, 'Should redo action');
    });
  }

  // 7. Performance Tests
  async performanceTests() {
    await this.test('Session creation performance', async () => {
      const start = Date.now();
      
      const response = await this.api.post('/planning-session', {
        settings: { duration_minutes: 30 }
      });
      
      const duration = Date.now() - start;
      
      assert(response.status === 201, 'Should create session');
      assert(duration < 1000, `Session creation should be fast (took ${duration}ms)`);
      
      // Clean up
      await this.api.post(`/planning-session/${response.data.id}/complete`);
    });

    await this.test('Bulk operations performance', async () => {
      const tasks = Array.from({ length: 50 }, (_, i) => ({
        title: `Bulk task ${i}`,
        assigned_to: (i % 2) + 1,
        due_date: '2024-12-31'
      }));

      const start = Date.now();
      
      const response = await this.api.post('/planning-session/tasks/bulk', {
        session_id: this.currentSessionId,
        tasks
      });
      
      const duration = Date.now() - start;
      
      assert(response.status === 201, 'Should create tasks');
      assert(duration < 2000, `Bulk creation should be fast (took ${duration}ms)`);
    });

    await this.test('Analytics query performance', async () => {
      const start = Date.now();
      
      const response = await this.api.get('/planning-session/analytics', {
        params: {
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        }
      });
      
      const duration = Date.now() - start;
      
      assert(response.status === 200, 'Should get analytics');
      assert(duration < 3000, `Analytics should be fast (took ${duration}ms)`);
    });

    await this.test('WebSocket message latency', async () => {
      if (!this.socket?.connected) {
        console.log('⚠️  Skipping WebSocket test - not connected');
        return;
      }

      return new Promise((resolve, reject) => {
        const start = Date.now();
        
        this.socket.once('pong', () => {
          const latency = Date.now() - start;
          assert(latency < 100, `WebSocket latency should be low (${latency}ms)`);
          resolve();
        });

        this.socket.emit('ping');
        setTimeout(() => reject(new Error('WebSocket ping timeout')), 1000);
      });
    });
  }

  // Helper methods
  async test(name, testFn) {
    try {
      await testFn();
      this.recordSuccess(name);
    } catch (error) {
      this.recordFailure(name, error.message, error);
    }
  }

  recordSuccess(testName) {
    console.log(`  ✅ ${testName}`);
    this.testResults.push({
      name: testName,
      status: 'passed',
      timestamp: new Date()
    });
  }

  recordFailure(testName, message, error) {
    console.log(`  ❌ ${testName}`);
    console.log(`     Error: ${message}`);
    if (error.response?.data) {
      console.log(`     Response: ${JSON.stringify(error.response.data)}`);
    }
    
    this.testResults.push({
      name: testName,
      status: 'failed',
      error: message,
      details: error,
      timestamp: new Date()
    });
  }

  printTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.name}`);
          console.log(`    ${r.error}`);
        });
    }

    // Generate report file
    this.generateTestReport();
  }

  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'passed').length,
        failed: this.testResults.filter(r => r.status === 'failed').length
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(r => r.status === 'failed');

    // Analyze failure patterns
    const categories = {
      auth: failedTests.filter(t => t.error?.includes('auth') || t.error?.includes('token')),
      websocket: failedTests.filter(t => t.error?.includes('socket') || t.error?.includes('WebSocket')),
      database: failedTests.filter(t => t.error?.includes('database') || t.error?.includes('SQL')),
      performance: failedTests.filter(t => t.name?.includes('performance'))
    };

    if (categories.auth.length > 0) {
      recommendations.push({
        area: 'Authentication',
        issue: 'Multiple authentication failures detected',
        suggestion: 'Review auth middleware and token validation logic'
      });
    }

    if (categories.websocket.length > 0) {
      recommendations.push({
        area: 'Real-time Features',
        issue: 'WebSocket connection issues',
        suggestion: 'Check Socket.io configuration and ensure proper event handling'
      });
    }

    if (categories.database.length > 0) {
      recommendations.push({
        area: 'Database',
        issue: 'Database operation failures',
        suggestion: 'Review database schema and query optimization'
      });
    }

    if (categories.performance.length > 0) {
      recommendations.push({
        area: 'Performance',
        issue: 'Performance benchmarks not met',
        suggestion: 'Profile slow operations and implement caching where appropriate'
      });
    }

    return recommendations;
  }
}

// Run the test suite
async function runTests() {
  const suite = new PlanningWorkflowTestSuite();
  
  try {
    await suite.setup();
    await suite.runAllTests();
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await suite.teardown();
  }
}

// Export for use in other test runners
module.exports = { PlanningWorkflowTestSuite, runTests };

// Run if executed directly
if (require.main === module) {
  runTests();
}