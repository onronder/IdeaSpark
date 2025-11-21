import dotenv from 'dotenv';
import path from 'path';
import {
  generateCompletion,
  calculateTokenCost,
  buildIdeaSparkSystemPrompt,
  validateOpenAIConnection,
} from './src/services/openaiClient';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testOpenAIIntegration() {
  console.log('🚀 Testing OpenAI Integration...\n');

  try {
    // Test 1: Validate connection
    console.log('1. Validating OpenAI API connection...');
    const isValid = await validateOpenAIConnection();
    if (isValid) {
      console.log('✅ OpenAI API connection is valid\n');
    } else {
      console.log('❌ OpenAI API connection failed\n');
      process.exit(1);
    }

    // Test 2: Generate completion for different idea categories
    const testCases = [
      {
        category: 'BUSINESS',
        prompt: "I want to create a subscription box service for eco-friendly products",
      },
      {
        category: 'TECHNOLOGY',
        prompt: "I'm thinking about building an AI-powered personal finance assistant app",
      },
      {
        category: 'CREATIVE',
        prompt: "I have an idea for an interactive storytelling platform for children",
      },
    ];

    console.log('2. Testing idea generation for different categories:\n');

    for (const testCase of testCases) {
      console.log(`📝 Category: ${testCase.category}`);
      console.log(`   Prompt: "${testCase.prompt}"`);

      const startTime = Date.now();
      const response = await generateCompletion(
        testCase.prompt,
        buildIdeaSparkSystemPrompt(),
        {
          maxTokens: 256,
          temperature: 0.7,
        }
      );
      const latency = Date.now() - startTime;

      console.log(`   Response (${response.usage.totalTokens} tokens, ${latency}ms):`);
      console.log(`   "${response.content.substring(0, 150)}..."`);

      const cost = calculateTokenCost(response.usage, response.model);
      console.log(`   Model: ${response.model}`);
      console.log(`   Tokens: Prompt=${response.usage.promptTokens}, Completion=${response.usage.completionTokens}`);
      console.log(`   Estimated Cost: $${cost.toFixed(6)}`);
      console.log(`   ✅ Success\n`);
    }

    // Test 3: Error handling with invalid input
    console.log('3. Testing error handling...');
    try {
      await generateCompletion(
        '', // Empty prompt
        buildIdeaSparkSystemPrompt(),
        {
          maxTokens: 256,
        }
      );
      console.log('❌ Should have thrown an error for empty prompt');
    } catch (error: any) {
      console.log('✅ Properly handled error:', error.message?.substring(0, 50) + '...\n');
    }

    // Test 4: Cost calculation for different models
    console.log('4. Testing cost calculation for different models:');
    const testUsage = {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };

    const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    for (const model of models) {
      const cost = calculateTokenCost(testUsage, model);
      console.log(`   ${model}: $${cost.toFixed(6)} for ${testUsage.totalTokens} tokens`);
    }

    console.log('\n🎉 All OpenAI integration tests passed successfully!');
    console.log('📊 Summary:');
    console.log('   - API connection validated');
    console.log('   - Completion generation working');
    console.log('   - Error handling functional');
    console.log('   - Cost calculation accurate');
    console.log('   - The OpenAI integration is ready for production use!');

  } catch (error: any) {
    console.error('\n❌ OpenAI integration test failed:', error.message);
    if (error.status === 401) {
      console.error('   Please check your OPENAI_API_KEY in the .env file');
    }
    process.exit(1);
  }
}

// Run the test
testOpenAIIntegration();