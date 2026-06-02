-- =================== EXTEND ORDERS ===================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS limit_price numeric,
  ADD COLUMN IF NOT EXISTS stop_price numeric,
  ADD COLUMN IF NOT EXISTS trail_percent numeric,
  ADD COLUMN IF NOT EXISTS linked_order_id uuid;

-- allow users to insert/update/cancel their own orders
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
CREATE POLICY orders_insert_own ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS orders_update_own ON public.orders;
CREATE POLICY orders_update_own ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- allow users to insert/update their holdings (server fns run as the user)
DROP POLICY IF EXISTS holdings_insert_own ON public.holdings;
CREATE POLICY holdings_insert_own ON public.holdings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS holdings_update_own ON public.holdings;
CREATE POLICY holdings_update_own ON public.holdings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =================== FUTURES POSITIONS ===================
CREATE TABLE IF NOT EXISTS public.futures_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('long','short')),
  leverage integer NOT NULL CHECK (leverage BETWEEN 1 AND 125),
  entry_price numeric NOT NULL,
  size_usdt numeric NOT NULL,
  margin_usdt numeric NOT NULL,
  liquidation_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','liquidated')),
  close_price numeric,
  realized_pnl numeric,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.futures_positions TO authenticated;
GRANT ALL ON public.futures_positions TO service_role;
ALTER TABLE public.futures_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fp_own ON public.futures_positions FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- =================== TRADING BOTS ===================
CREATE TABLE IF NOT EXISTS public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bot_type text NOT NULL CHECK (bot_type IN ('grid','dca')),
  symbol text NOT NULL,
  investment_usdt numeric NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','paused','stopped')),
  total_pnl numeric NOT NULL DEFAULT 0,
  total_trades integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT ALL ON public.bots TO service_role;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY bots_own ON public.bots FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- =================== COPY TRADING LEADERS (curated, public read) ===================
CREATE TABLE IF NOT EXISTS public.copy_leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  avatar_seed text NOT NULL,
  bio text,
  roi_30d numeric NOT NULL,
  win_rate numeric NOT NULL,
  followers integer NOT NULL DEFAULT 0,
  aum_usdt numeric NOT NULL DEFAULT 0,
  total_pnl numeric NOT NULL DEFAULT 0,
  badge text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.copy_leaders TO anon, authenticated;
GRANT ALL ON public.copy_leaders TO service_role;
ALTER TABLE public.copy_leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY leaders_public_read ON public.copy_leaders FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.copy_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  leader_id uuid NOT NULL REFERENCES public.copy_leaders(id) ON DELETE CASCADE,
  allocation_usdt numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','stopped')),
  current_pnl numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  UNIQUE (user_id, leader_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copy_follows TO authenticated;
GRANT ALL ON public.copy_follows TO service_role;
ALTER TABLE public.copy_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY follows_own ON public.copy_follows FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- =================== EARN: STAKING ===================
CREATE TABLE IF NOT EXISTS public.staking_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_symbol text NOT NULL,
  apy numeric NOT NULL,
  lock_days integer NOT NULL DEFAULT 0,
  min_amount numeric NOT NULL DEFAULT 0,
  is_flexible boolean NOT NULL DEFAULT true,
  badge text
);
GRANT SELECT ON public.staking_products TO anon, authenticated;
GRANT ALL ON public.staking_products TO service_role;
ALTER TABLE public.staking_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_public_read ON public.staking_products FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.stakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.staking_products(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  rewards_accumulated numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stakes TO authenticated;
GRANT ALL ON public.stakes TO service_role;
ALTER TABLE public.stakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY stakes_own ON public.stakes FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- =================== SEED COPY LEADERS ===================
INSERT INTO public.copy_leaders (display_name, avatar_seed, bio, roi_30d, win_rate, followers, aum_usdt, total_pnl, badge) VALUES
('CryptoWhale_X','whale1','BTC swing trader. 5y experience.',187.4,78.2,12450,2840000,5240000,'TOP'),
('AlphaQuant','alpha2','Quantitative algo trading on majors.',142.8,82.5,9870,1920000,3120000,'PRO'),
('SatoshiSon','sats3','High-conviction ETH & SOL positions.',98.3,71.4,7320,1140000,1980000,NULL),
('NeoTrader','neo4','Scalper, BTC/ETH perpetuals.',76.5,68.9,5180,820000,1240000,NULL),
('DiamondHands','dh5','Long-term holder turned active trader.',54.2,74.1,4290,620000,940000,NULL),
('VoltaireFX','volt6','Macro & altcoin rotations.',211.6,65.3,3110,410000,820000,'TOP')
ON CONFLICT DO NOTHING;

-- =================== SEED STAKING PRODUCTS ===================
INSERT INTO public.staking_products (asset_symbol, apy, lock_days, min_amount, is_flexible, badge) VALUES
('USDT', 8.5, 0, 10, true, 'HOT'),
('USDC', 7.8, 0, 10, true, NULL),
('BTC', 3.2, 0, 0.0005, true, NULL),
('ETH', 4.8, 0, 0.01, true, 'HOT'),
('SOL', 6.5, 30, 0.5, false, NULL),
('BNB', 5.4, 30, 0.1, false, NULL),
('USDT', 12.3, 90, 100, false, 'HIGH APY'),
('ETH', 7.2, 60, 0.05, false, NULL),
('ADA', 5.8, 30, 50, false, NULL),
('DOT', 9.4, 60, 5, false, NULL)
ON CONFLICT DO NOTHING;