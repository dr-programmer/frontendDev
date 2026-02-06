"use strict";

let points = 73;
let grade;
let gradeName;

if (points < 0 || points > 100) {
  console.log("Грешка: Невалидни точки");
} else if (points >= 90) {
  grade = 6;
  gradeName = "Отличен";
} else if (points >= 75) {
  grade = 5;
  gradeName = "Много добър";
} else if (points >= 60) {
  grade = 4;
  gradeName = "Добър";
} else if (points >= 50) {
  grade = 3;
  gradeName = "Среден";
} else {
  grade = 2;
  gradeName = "Слаб";
}

if (grade !== undefined) {
  console.log(`Точки: ${points} -> Оценка: ${grade} (${gradeName})`);
}
