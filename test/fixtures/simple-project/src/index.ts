import { add, multiply } from "./utils.js";

export function calculate(a: number, b: number): number {
  return add(a, b) + multiply(a, b);
}
