"use strict";

let grades = [6, 5, 4, 6, 5, 3, 6, 5, 4, 6];

let countSix = 0;
let countFive = 0;
let sum = 0;

for (let i = 0; i < grades.length; i++) {
  sum += grades[i];
  if (grades[i] === 6) countSix++;
  if (grades[i] === 5) countFive++;
}

let index = 1;
for (const grade of grades) {
  console.log(`Оценка ${index}: ${grade}`);
  index++;
}

console.log(`Брой отличени: ${countSix}`);
console.log(`Брой много добри: ${countFive}`);
console.log(`Средна оценка: ${(sum / grades.length).toFixed(2)}`);
