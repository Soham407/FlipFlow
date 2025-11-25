-- Add plan_id column to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Update existing subscriptions to have plan_id set to 'pro'
UPDATE subscriptions 
SET plan_id = 'pro' 
WHERE status = 'completed' AND plan_id IS NULL;

-- Add comment
COMMENT ON COLUMN subscriptions.plan_id IS 'Subscription tier: starter, hobby, business, or pro';
