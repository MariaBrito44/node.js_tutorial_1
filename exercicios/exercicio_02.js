let prompt = require("prompt-sync");
prompt = prompt();

console.log("Somar dois números:");

const n1 = parseFloat (prompt("Digite o primeiro número: "))
const n2 = parseFloat (prompt("Digite o segundo número: "))

console.log(`A soma do primeiro número com o segundo é: ${n1+n2}`);
console.log("A subtração entre n1 e n2 (n1-n2) é: (n1-n2)", n1-n2);
console.log(`A multiplicação do primeiro número com o segundo é: ${n1*n2}`);
console.log("A divisão entre n1 e n2 (n1/n2) é:", n1/n2);





