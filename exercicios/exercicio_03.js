const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.send("Alô SESI Sumaré!!!")
})

//Exercicio criar uma rota para a página Sobre
app.get("/sobre", (req, res) => {
    res.send("Você está na página sobre!!!")
})

app.listen(3000, () => {
    console.log('Servidor NODE.js ativo na porta 3000');
});

