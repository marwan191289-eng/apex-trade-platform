import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/),
  price: z.number().positive(),
  rsi: z.number().min(0).max(100),
  momentum: z.number(),
  atrPct: z.number().min(0),
  volDelta: z.number().min(-1).max(1),
  signal: z.number().min(-100).max(100),
  ema9: z.number().positive(),
  ema21: z.number().positive(),
  ema50: z.number().positive(),
  high20: z.number().positive(),
  low20: z.number().positive(),
  changePct24h: z.number(),
});

export interface Prediction {
  direction: "up" | "down" | "flat";
  confidence: number; // 0-100
  targetPrice: number;
  support: number;
  resistance: number;
  reasoning: string;
  horizonMinutes: number;
  source: "ai" | "stat";
}

export const getPricePrediction = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }): Promise<Prediction> => {
    const apiKey = process.env.LOVABLE_API_KEY;

    // Statistical baseline (always computed, used as fallback)
    const statDir: "up" | "down" | "flat" =
      data.signal > 15 ? "up" : data.signal < -15 ? "down" : "flat";
    const statConfidence = Math.min(95, Math.abs(data.signal) + 30);
    const expectedMove = (data.atrPct / 100) * data.price * 0.6; // ~10min portion of daily ATR
    const statTarget =
      statDir === "up" ? data.price + expectedMove :
      statDir === "down" ? data.price - expectedMove : data.price;

    const statPrediction: Prediction = {
      direction: statDir,
      confidence: Math.round(statConfidence * 0.7), // stat-only baseline
      targetPrice: statTarget,
      support: data.low20,
      resistance: data.high20,
      reasoning: `Composite signal ${data.signal.toFixed(0)} • RSI ${data.rsi.toFixed(0)} • Vol Δ ${(data.volDelta * 100).toFixed(0)}%`,
      horizonMinutes: 10,
      source: "stat",
    };

    if (!apiKey) return statPrediction;

    const prompt = `You are a quantitative crypto market analyst. Given live indicators for ${data.symbol}/USDT, predict the price direction over the next 10 minutes. Be decisive.

Live data:
- Price: $${data.price}
- 24h change: ${data.changePct24h.toFixed(2)}%
- RSI(14, 1m): ${data.rsi.toFixed(1)}
- Momentum vs EMA21: ${data.momentum.toFixed(2)}%
- ATR%: ${data.atrPct.toFixed(2)}%
- Taker buy/sell delta (last 20m): ${(data.volDelta * 100).toFixed(0)}%
- EMA9 / EMA21 / EMA50: ${data.ema9.toFixed(4)} / ${data.ema21.toFixed(4)} / ${data.ema50.toFixed(4)}
- 20-bar high / low: ${data.high20.toFixed(4)} / ${data.low20.toFixed(4)}
- Composite stat signal: ${data.signal.toFixed(0)} (range -100..+100)

Return ONLY valid JSON, no markdown, no prose:
{"direction":"up|down|flat","confidence":0-100,"targetPrice":<number>,"support":<number>,"resistance":<number>,"reasoning":"<<=140 chars Arabic explanation>"}`;

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You output only valid JSON. No markdown." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) return statPrediction;
      const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = j.choices?.[0]?.message?.content;
      if (!content) return statPrediction;
      const parsed = JSON.parse(content) as Partial<Prediction>;
      if (!parsed.direction || typeof parsed.confidence !== "number") return statPrediction;

      // Blend AI confidence with statistical agreement
      const agree = parsed.direction === statDir ? 1 : parsed.direction === "flat" || statDir === "flat" ? 0.7 : 0.5;
      const blendedConf = Math.round(Math.min(98, parsed.confidence * agree));

      return {
        direction: parsed.direction,
        confidence: blendedConf,
        targetPrice: Number(parsed.targetPrice) || statTarget,
        support: Number(parsed.support) || data.low20,
        resistance: Number(parsed.resistance) || data.high20,
        reasoning: String(parsed.reasoning || statPrediction.reasoning).slice(0, 180),
        horizonMinutes: 10,
        source: "ai",
      };
    } catch {
      return statPrediction;
    }
  });
