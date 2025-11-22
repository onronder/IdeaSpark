#!/usr/bin/env ts-node
/**
 * Test script to verify Sentry is working
 * Run with: npx ts-node scripts/test-sentry.ts
 */

import { captureException, captureMessage, addBreadcrumb } from '../sentry.config';

console.log('Testing Sentry integration...\n');

// Test 1: Breadcrumb
console.log('1. Adding test breadcrumb...');
addBreadcrumb({
  message: 'Test breadcrumb from script',
  category: 'test',
  level: 'info',
  data: { source: 'test-sentry.ts' }
});

// Test 2: Message
console.log('2. Sending test message...');
captureMessage('Test message from IdeaSpark', 'info');

// Test 3: Error
console.log('3. Sending test error...');
try {
  throw new Error('Test error from IdeaSpark - this is intentional for testing');
} catch (error) {
  captureException(error, {
    test: true,
    source: 'test-sentry.ts'
  });
}

console.log('\n✅ Test complete!');
console.log('Check your Sentry dashboard at: https://fittechs.sentry.io/issues/');
console.log('\nNote: If you see "Sentry DSN not configured", add your DSN to .env first');
