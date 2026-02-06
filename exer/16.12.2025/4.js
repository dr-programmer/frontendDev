"use strict";

const add = (a, b) => a + b;
const subtract = (a, b) => a - b;
const multiply = (a, b) => a * b;
const divide = (a, b) => b === 0 ? "Cannot divide by zero" : a / b;
const power = (a, b) => a ** b;

function calculate(operation, a, b) {
  if (operation === "add") return add(a, b);
  if (operation === "subtract") return subtract(a, b);
  if (operation === "multiply") return multiply(a, b);
  if (operation === "divide") return divide(a, b);
  if (operation === "power") return power(a, b);
  return "Invalid operation";
}

console.log(calculate("add", 5, 3));
console.log(calculate("multiply", 4, 7));
console.log(calculate("divide", 10, 2));
console.log(calculate("divide", 10, 0));
console.log(calculate("power", 2, 3));
console.log(calculate("invalid", 1, 2));
