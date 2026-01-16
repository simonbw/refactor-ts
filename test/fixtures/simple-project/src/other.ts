import { PI, add } from "./utils.js";

export function circleArea(radius: number): number {
  return multiply(PI, multiply(radius, radius));
}

function multiply(a: number, b: number): number {
  return a * b;
}

export function sum(...nums: number[]): number {
  return nums.reduce((acc, n) => add(acc, n), 0);
}
