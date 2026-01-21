import { add, multiply } from "./lib/utils.js";
import { formatNumber } from "./lib/format.js";

export function calculate(a: number, b: number): string {
  const result = add(a, b) + multiply(a, b);
  return formatNumber(result);
}
