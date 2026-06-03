
CREATE POLICY "Users can delete their own holdings"
ON public.holdings FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
ON public.orders FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.wallets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallet"
ON public.wallets FOR DELETE TO authenticated
USING (auth.uid() = user_id);
