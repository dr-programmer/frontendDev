"use strict";

const firstName = "Иван";
const lastName = "Петров";
const age = 16;
const grade = 11;
const averageScore = 5.75;
const isExcellent = averageScore >= 5.5;

const status = isExcellent ? "Отличник" : "Не е отличник";

console.log(`${firstName} ${lastName}, ${age} год., клас ${grade}, среден успех: ${averageScore.toFixed(2)} - ${status}`);
