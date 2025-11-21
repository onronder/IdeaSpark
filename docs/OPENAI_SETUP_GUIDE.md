# OpenAI API Setup Guide for IdeaSpark

This guide provides detailed instructions for creating and configuring your OpenAI API key for production use in IdeaSpark.

---

## 1. Create OpenAI Account

### Step 1: Sign Up
1. Visit [platform.openai.com](https://platform.openai.com)
2. Click **"Sign up"** (or **"Log in"** if you have an account)
3. Sign up using:
   - Email address, or
   - Google account, or
   - Microsoft account
4. Verify your email address (check spam folder)

### Step 2: Add Payment Method (REQUIRED for Production)
1. Go to [platform.openai.com/settings/organization/billing/overview](https://platform.openai.com/settings/organization/billing/overview)
2. Click **"Add payment method"**
3. Add your credit/debit card
4. **Set up spending limits** (highly recommended):
   - Click **"Usage limits"**
   - Set **Hard limit**: $50/month (recommended starting point)
   - Set **Soft limit**: $30/month (for email alerts)
   - You can adjust these based on your user base

---

## 2. Generate API Key

### Step 1: Navigate to API Keys
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**

### Step 2: Configure the Key
1. **Name**: `IdeaSpark-Production` (or your preferred name)
2. **Permissions**: Select **"All"** (default)
   - For stricter security, you can select **"Restricted"** and enable only:
     - `Model capabilities` → `Read & Write`
3. Click **"Create secret key"**

### Step 3: Save Your Key
1. **IMPORTANT**: Copy the key immediately (it starts with `sk-proj-...`)
2. Store it securely (you won't be able to see it again)
3. **DO NOT** commit this key to Git or share it publicly

---

## 3. Recommended Production Configuration

### Model Selection
For IdeaSpark's idea generation use case, we recommend:

**Current Configuration** (already set in your `.env`):
```bash
OPENAI_MODEL=gpt-4o-mini
```

**Why `gpt-4o-mini`?**
- **Cost-effective**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Fast response times**: < 2 seconds
- **Good quality**: Suitable for creative idea generation
- **Budget-friendly**: A typical idea generation uses ~500-2000 tokens

**Alternative Models** (if you need better quality):
- `gpt-4o`: Higher quality, 3-5x more expensive ($2.50/$10 per 1M tokens)
- `gpt-4-turbo`: Best quality, 10x more expensive ($10/$30 per 1M tokens)

### Token & Temperature Settings
Your current configuration is already optimized:

```bash
OPENAI_MAX_TOKENS=512          # Sufficient for idea snippets
OPENAI_TEMPERATURE=0.4         # Balanced creativity vs. coherence
OPENAI_TIMEOUT=30000           # 30 seconds (prevents hanging)
```

**Explanation**:
- **MAX_TOKENS (512)**: Limits response length to ~400 words (cost control)
- **TEMPERATURE (0.4)**: Lower = more focused, higher = more creative (0.4 is a sweet spot)
- **TIMEOUT (30s)**: Prevents requests from hanging indefinitely

---

## 4. Add API Key to Environment File

### Update `.env` File
Open `/Users/onronder/IdeaSpark/server/.env` and update:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE  # Replace with your real key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=512
OPENAI_TEMPERATURE=0.4
OPENAI_TIMEOUT=30000
```

**Security Checklist**:
- [ ] `.env` is in `.gitignore` (already done)
- [ ] Never commit the real API key to Git
- [ ] Don't share the key in screenshots or logs

---

## 5. Cost Management & Monitoring

### Expected Costs for IdeaSpark
Based on your quota configuration:

**FREE Tier Users**:
- 1 idea generation/day
- ~1500 tokens per idea (input + output)
- **Cost per user/month**: ~$0.001 (1/10th of a cent)
- **100 free users/month**: ~$0.10

**PRO Tier Users**:
- Unlimited idea generation
- Assume 10 ideas/day average
- ~15,000 tokens/day
- **Cost per user/month**: ~$0.10
- **100 PRO users/month**: ~$10

**Total estimated cost** (100 free + 100 PRO): **~$10-15/month**

### Set Up Cost Alerts
1. Go to [platform.openai.com/settings/organization/billing/limits](https://platform.openai.com/settings/organization/billing/limits)
2. Configure:
   - **Hard limit**: $50/month (API stops working if exceeded)
   - **Soft limit**: $30/month (email alert, API keeps working)
3. Set up email notifications:
   - Go to [platform.openai.com/settings/organization/billing/overview](https://platform.openai.com/settings/organization/billing/overview)
   - Enable **"Email me when I reach 75% of my limit"**

### Monitor Usage
1. **Usage Dashboard**: [platform.openai.com/usage](https://platform.openai.com/usage)
   - View daily/monthly token consumption
   - Track costs per model
2. **IdeaSpark Analytics**: Your server logs AI costs in the `ai_usage_logs` table
   - Query: `SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 100`

---

## 6. Testing the Integration

### Test 1: Server Startup
After adding your API key, restart the server:

```bash
cd /Users/onronder/IdeaSpark/server
npm run dev
```

**Expected Output**:
```
✓ Database connected successfully
✓ Redis connected successfully
✓ Server running on http://localhost:3000
```

No OpenAI-related errors should appear.

### Test 2: Create an Idea via API
Use this `curl` command (replace `YOUR_JWT_TOKEN` with a valid user token):

```bash
curl -X POST http://localhost:3000/api/v1/ideas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sustainable Coffee Shop",
    "description": "A coffee shop that uses only biodegradable materials"
  }'
```

**Expected Response** (HTTP 201):
```json
{
  "id": "uuid-here",
  "title": "Sustainable Coffee Shop",
  "status": "ACTIVE",
  "aiGenerated": true,
  "createdAt": "2025-11-21T..."
}
```

### Test 3: Send a Message (Trigger AI)
```bash
curl -X POST http://localhost:3000/api/v1/ideas/{ideaId}/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What are some marketing strategies for this idea?"
  }'
```

**Expected Response** (HTTP 201):
```json
{
  "id": "uuid-here",
  "role": "assistant",
  "content": "Here are some marketing strategies...",
  "tokenUsage": 450,
  "costUsd": 0.0003
}
```

**Check Logs**:
```bash
# In your server logs, you should see:
[INFO] AI chat completion successful { tokens: 450, cost: 0.0003 }
```

---

## 7. Production Best Practices

### Rate Limiting (Already Configured)
Your server already has rate limiting in place:
- **Login attempts**: 5 per 15 minutes
- **Message sending**: 10 per minute
- **General API**: 100 requests per 15 minutes

These protect against abuse and excessive API costs.

### Error Handling
The server is configured to handle OpenAI errors gracefully:
- **Timeout errors**: Returns 504 Gateway Timeout
- **Rate limit errors**: Returns 429 Too Many Requests
- **Invalid API key**: Returns 500 with error logged (not exposed to user)

### Cost Protection
Your configuration already includes:
1. **Token limits**: Max 512 tokens per response
2. **Daily quotas**: Free tier limited to 1 idea/day
3. **Database logging**: All AI usage logged in `ai_usage_logs` table

### Security Checklist
- [ ] API key stored in `.env` (not hardcoded)
- [ ] `.env` in `.gitignore`
- [ ] Hard spending limit set ($50/month)
- [ ] Soft limit alert configured ($30/month)
- [ ] Rate limiting enabled
- [ ] Quota enforcement working

---

## 8. Troubleshooting

### Error: "Invalid API key"
**Symptoms**: Server logs show `401 Unauthorized` from OpenAI

**Solutions**:
1. Verify the key starts with `sk-proj-` (new format) or `sk-` (old format)
2. Check for extra spaces or newlines in `.env` file
3. Regenerate the key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Error: "Rate limit exceeded"
**Symptoms**: Server logs show `429 Rate Limit Exceeded`

**Solutions**:
1. Check your usage at [platform.openai.com/usage](https://platform.openai.com/usage)
2. Upgrade to a higher tier (Tier 1 requires $5 credit)
3. Implement exponential backoff (already built into your server)

### Error: "Insufficient quota"
**Symptoms**: `insufficient_quota` error in logs

**Solutions**:
1. Add a payment method at [platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)
2. Increase your spending limit
3. Check if your credit card was charged successfully

### High Costs
**Symptoms**: Unexpected high billing

**Investigate**:
1. Check `ai_usage_logs` table:
   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as requests,
     SUM(tokens_used) as total_tokens,
     SUM(cost_usd) as total_cost
   FROM ai_usage_logs
   GROUP BY DATE(created_at)
   ORDER BY date DESC
   LIMIT 30;
   ```
2. Look for:
   - Unusual spike in requests
   - Single user making many requests (abuse)
   - High token usage per request

**Solutions**:
1. Reduce `OPENAI_MAX_TOKENS` (currently 512)
2. Tighten rate limits
3. Review quota enforcement

---

## 9. Monitoring & Maintenance

### Weekly Checks
1. **Review costs**: [platform.openai.com/usage](https://platform.openai.com/usage)
2. **Check for errors**: `SELECT * FROM ai_usage_logs WHERE error IS NOT NULL`
3. **Monitor token usage**: Calculate average tokens per request

### Monthly Tasks
1. **Adjust spending limits** based on user growth
2. **Review model selection** (upgrade/downgrade based on quality needs)
3. **Optimize prompts** to reduce token usage

### Scaling Considerations
As your user base grows:
- **1,000 users** (~100 PRO): $100-150/month
- **10,000 users** (~1,000 PRO): $1,000-1,500/month
- **100,000 users** (~10,000 PRO): $10,000-15,000/month

Consider:
- Caching common responses
- Implementing prompt compression
- Using fine-tuned models (cheaper for specific tasks)

---

## 10. Next Steps

After configuring OpenAI:
1. [ ] Add API key to `.env` file
2. [ ] Restart server and verify no errors
3. [ ] Test idea creation endpoint
4. [ ] Test message sending (AI response)
5. [ ] Monitor costs for first 24 hours
6. [ ] Proceed to Firebase setup (see `FIREBASE_SETUP_GUIDE.md`)

---

## Support Resources

- **OpenAI Documentation**: https://platform.openai.com/docs
- **OpenAI Status Page**: https://status.openai.com
- **OpenAI Community**: https://community.openai.com
- **Pricing Calculator**: https://openai.com/api/pricing
- **IdeaSpark Issues**: https://github.com/onronder/IdeaSpark/issues
