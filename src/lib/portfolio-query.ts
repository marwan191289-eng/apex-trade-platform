import { queryOptions } from "@tanstack/react-query";
import { getPortfolio } from "./trading.functions";

export const portfolioQuery = queryOptions({
  queryKey: ["portfolio"],
  queryFn: () => getPortfolio(),
  staleTime: 10_000,
});
