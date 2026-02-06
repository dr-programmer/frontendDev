"use strict";

let studentsJSON = '[{"name":"Иван","grade":5.5},{"name":"Мария","grade":6},{"name":"Георги","grade":4.25}]';

const students = JSON.parse(studentsJSON);

const mapped = students.map(s => ({
  name: s.name,
  grade: s.grade,
  status: s.grade >= 5.5 ? "Отличник" : "Добър ученик"
}));

const filtered = mapped.filter(s => s.status === "Отличник");

const result = JSON.stringify(filtered, null, 2);

console.log(result);
