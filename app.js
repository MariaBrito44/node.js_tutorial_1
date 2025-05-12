const express = require("express");
const sqlite3 = require("sqlite3");

const app = express();

// Conexão com o banco de dados
const db = new sqlite3.Database("users.db");

db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
    );
});

app.use('/static', express.static(__dirname + '/static'));

// Configuração para processar requisições POST
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    console.log("GET /");
    res.render("pages/index");
});

app.get("/sobre", (req, res) => {
    res.render("pages/sobre");
});

app.get("/dashboard", (req, res) => {
    console.log("GET /dashboard");
    res.render("pages/dashboard");
});

app.get("/cadastro", (req, res) => {
    console.log("GET /cadastro");
    res.render("pages/cadastro");
});

app.post("/cadastro", (req, res) => {
    console.log("POST /cadastro");
    console.log(JSON.stringify(req.body));
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username=?";

    db.get(query, [username], (err, row) => {
        if (err) throw err;

        console.log("Query SELECT do cadastro:", JSON.stringify(row));
        if (row) {
            console.log(`Usuário: ${username} já cadastrado`);
            res.send("Usuário já cadastrado");
        } else {
            const insert = "INSERT INTO users (username, password) VALUES (?, ?)";
            db.run(insert, [username, password], (err) => {
                if (err) throw err;

                console.log(`Usuário: ${username} cadastrado com sucesso.`);
                res.redirect("/login");
            });
        }
    });
});

app.post("/login", (req, res) => {
    console.log("POST /login");
    console.log(JSON.stringify(req.body));
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username=? AND password=?";
    db.get(query, [username, password], (err, row) => {
        if (err) throw err;

        console.log(JSON.stringify(row));
        if (row) {
            res.redirect("/dashboard");
        } else {
            res.send("Usuário inválido");
        }
    });
});

app.get("/login", (req, res) => {
    console.log("GET /login");
    res.render("pages/login");
});

app.listen(3000, () => {
    console.log("Servidor NODEjs ativo na porta 3000");
    console.log(__dirname + "\\static");
});