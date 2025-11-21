// Simple OpenAI test without full config dependencies
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load OpenAI API key from .env file
function loadOpenAIKey() {
  const envPath = path.resolve(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('OPENAI_API_KEY=')) {
      return line.split('=')[1].trim();
    }
  }
  throw new Error('OPENAI_API_KEY not found in .env file');
}

async function testOpenAI() {
  console.log('🚀 Testing OpenAI Integration (Simple Test)...\n');

  try {
    const apiKey = loadOpenAIKey();
    console.log('✅ OpenAI API key found\n');

    const openai = new OpenAI({
      apiKey: apiKey,
      timeout: 30000,
    });

    // Test 1: Validate connection
    console.log('1. Validating OpenAI API connection...');
    try {
      const models = await openai.models.list();
      console.log(`✅ Connection successful! Found ${models.data.length} models\n`);
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      process.exit(1);
    }

    // Test 2: Generate a simple completion
    console.log('2. Generating a test completion...');
    console.log('   Prompt: "I want to create a mobile app for tracking daily habits"');

    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are IdeaSpark AI, a creative assistant that helps refine and develop ideas. Be encouraging, practical, and provide actionable advice.'
        },
        {
          role: 'user',
          content: 'I want to create a mobile app for tracking daily habits. What are the key features I should consider?'
        }
      ],
      temperature: 0.7,
      max_tokens: 256,
    });

    const latency = Date.now() - startTime;
    const response = completion.choices[0].message.content;
    const usage = completion.usage;

    console.log(`\n   Response (${latency}ms):`);
    console.log(`   "${response.substring(0, 200)}..."\n`);
    console.log(`   Model: ${completion.model}`);
    console.log(`   Tokens used: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`);

    // Calculate cost (gpt-4o-mini pricing)
    const inputCost = (usage.prompt_tokens / 1000000) * 0.15; // $0.15 per 1M tokens
    const outputCost = (usage.completion_tokens / 1000000) * 0.60; // $0.60 per 1M tokens
    const totalCost = inputCost + outputCost;
    console.log(`   Estimated cost: $${totalCost.toFixed(6)}\n`);

    console.log('🎉 OpenAI integration test passed successfully!');
    console.log('✅ The OpenAI API is properly configured and working.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.status === 401) {
      console.error('   Invalid API key. Please check your OPENAI_API_KEY in the .env file');
    } else if (error.status === 429) {
      console.error('   Rate limit exceeded. The API key is valid but you may need to wait or upgrade your plan.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   Network error. Please check your internet connection.');
    }
    process.exit(1);
  }
}

// Run the test
testOpenAI();