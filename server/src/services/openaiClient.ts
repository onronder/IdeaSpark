import { OpenAI } from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

// Types for OpenAI responses
export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface OpenAIResponse {
  content: string;
  usage: OpenAIUsage;
  model: string;
}

// OpenAI client configuration
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// Initialize OpenAI client with environment key
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  timeout: DEFAULT_TIMEOUT,
  maxRetries: 0, // We'll handle retries manually for better control
});

/**
 * Implements exponential backoff for retries
 */
function calculateBackoff(attemptNumber: number): number {
  return INITIAL_BACKOFF * Math.pow(2, attemptNumber - 1) + Math.random() * 1000;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  if (error?.status === 429) return true; // Rate limit
  if (error?.status >= 500) return true; // Server errors
  if (error?.code === 'ECONNRESET') return true; // Connection reset
  if (error?.code === 'ETIMEDOUT') return true; // Timeout
  if (error?.message?.includes('network')) return true; // Network errors
  return false;
}

/**
 * Main function to call OpenAI API with retry logic
 */
export async function generateCompletion(
  prompt: string,
  systemPrompt?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    user?: string;
  }
): Promise<OpenAIResponse> {
  const model = options?.model || DEFAULT_MODEL;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;

  logger.info({
    model,
    temperature,
    maxTokens,
    promptLength: prompt.length,
    user: options?.user,
  }, 'Calling OpenAI API');

  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt,
      });

      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        user: options?.user,
      });

      const responseContent = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      logger.info({
        model: completion.model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        finishReason: completion.choices[0]?.finish_reason,
      }, 'OpenAI API call successful');

      return {
        content: responseContent,
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
        },
        model: completion.model,
      };
    } catch (error: any) {
      lastError = error;

      logger.error('OpenAI API call failed', error, {
        attempt,
        status: error?.status,
        code: error?.code,
        message: error?.message,
        type: error?.type,
      });

      // Check if error is retryable
      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        break;
      }

      // Calculate backoff time
      const backoffMs = calculateBackoff(attempt);
      logger.info({
        attempt,
        nextAttempt: attempt + 1,
      }, `Retrying OpenAI API call after ${backoffMs}ms`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  // If we get here, all retries failed
  const errorMessage = lastError?.message || 'Failed to generate AI response';
  const errorStatus = lastError?.status;

  if (errorStatus === 429) {
    throw new AppError(429, 'Rate limit exceeded. Please try again later.', 'RATE_LIMIT_ERROR');
  } else if (errorStatus === 401) {
    throw new AppError(500, 'AI service configuration error', 'OPENAI_AUTH_ERROR');
  } else if (errorStatus >= 500) {
    throw new AppError(503, 'AI service temporarily unavailable', 'OPENAI_SERVER_ERROR');
  } else {
    throw new AppError(500, errorMessage, 'OPENAI_API_ERROR');
  }
}

/**
 * Stream completion from OpenAI (for future use)
 */
export async function* streamCompletion(
  prompt: string,
  systemPrompt?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    user?: string;
  }
): AsyncGenerator<string, OpenAIUsage, unknown> {
  const model = options?.model || DEFAULT_MODEL;
  const temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;

  logger.info({
    model,
    temperature,
    maxTokens,
    promptLength: prompt.length,
  }, 'Starting OpenAI streaming');

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      user: options?.user,
    });

    let totalTokens = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }

      // Track usage if available
      if (chunk.usage) {
        totalTokens = chunk.usage.total_tokens || 0;
      }
    }

    // Return usage data
    return {
      promptTokens: 0, // Not available in streaming
      completionTokens: 0, // Not available in streaming
      totalTokens,
    };
  } catch (error: any) {
    logger.error('OpenAI streaming failed', error);
    throw new AppError(500, 'Failed to stream AI response', 'OPENAI_STREAM_ERROR');
  }
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateTokenCost(
  usage: OpenAIUsage,
  model: string = DEFAULT_MODEL
): number {
  // Pricing as of 2024 (in USD per 1K tokens)
  // These should ideally come from config or database
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // $0.15 per 1M input, $0.60 per 1M output
    'gpt-4o': { input: 0.0025, output: 0.01 }, // $2.50 per 1M input, $10.00 per 1M output
    'gpt-4-turbo': { input: 0.01, output: 0.03 }, // $10 per 1M input, $30 per 1M output
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // $0.50 per 1M input, $1.50 per 1M output
  };

  const modelPricing = pricing[model] || pricing[DEFAULT_MODEL];

  if (!modelPricing) {
    throw new Error(`No pricing information available for model: ${model}`);
  }

  const inputCost = (usage.promptTokens / 1000) * modelPricing.input;
  const outputCost = (usage.completionTokens / 1000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Build system prompt for IdeaSpark
 */
export function buildIdeaSparkSystemPrompt(): string {
  return `You are IdeaSpark AI, a creative and helpful assistant specialized in refining and developing ideas.

Your role is to:
1. Help users explore, validate, and improve their ideas
2. Ask thoughtful questions to uncover hidden potential or challenges
3. Provide constructive feedback and actionable suggestions
4. Encourage creative thinking while being practical
5. Break down complex ideas into manageable steps

Communication style:
- Be encouraging and supportive, but honest about potential challenges
- Use clear, concise language
- Provide specific, actionable advice
- Ask clarifying questions when needed
- Celebrate progress and learning

Remember: Every great innovation started as a simple idea. Your job is to help nurture and develop these ideas into something remarkable.`;
}

/**
 * Validate OpenAI API key on startup
 */
export async function validateOpenAIConnection(): Promise<boolean> {
  try {
    logger.info('Validating OpenAI API connection...');

    const response = await openai.models.list();

    logger.info({
      modelsAvailable: response.data.length,
    }, 'OpenAI API connection validated successfully');

    return true;
  } catch (error: any) {
    logger.error('OpenAI API connection validation failed', error, {
      status: error?.status,
      message: error?.message,
    });

    if (error?.status === 401) {
      logger.error('Invalid OpenAI API key. Please check OPENAI_API_KEY environment variable.');
    }

    return false;
  }
}

export default {
  generateCompletion,
  streamCompletion,
  calculateTokenCost,
  buildIdeaSparkSystemPrompt,
  validateOpenAIConnection,
};