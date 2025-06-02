const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3");

const app = express();

// Conexão com o banco de dados
const db = new sqlite3.Database("users.db");

db.serialize(() => {
    db.run(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
    );
});

app.use(
    session({
        secret: "senhaforte",
        resave: true,
        saveUninitialized: true,
    })
);

app.use('/static', express.static(__dirname + '/static'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get("/", (req, res) => {
    console.log("GET /");
    res.render("pages/index", { titulo: "Index", req: req });
});

app.get("/sobre", (req, res) => {
    res.render("pages/sobre", { titulo: "Sobre", req: req });
});

app.get("/dashboard", (req, res) => {
    console.log("GET /dashboard");
    if (req.session.loggedin) {
        const query = "SELECT * FROM users";
        db.all(query, [], (err, row) => {
            if (err) throw err;
            res.render("pages/dashboard", { titulo: "Tabela de usuários", dados: row, req: req });
        });
    } else {
        res.redirect("/nao_autorizado");
    }
});

app.get("/nao_autorizado", (req, res) => {
    res.render("pages/nao_autorizado", { titulo: "Não autorizado", req: req });
});

app.get("/logout", (req, res) => {
    console.log("GET /logout");
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.get("/cadastro", (req, res) => {
    console.log("GET /cadastro");
    res.render("pages/cadastro", { titulo: "Cadastro", req: req });
});

app.post("/cadastro", (req, res) => {
    console.log("POST /cadastro");
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username=?";
    db.get(query, [username], (err, row) => {
        if (err) throw err;

        if (row) {
            console.log(`Usuário: ${username} já cadastrado`);
            res.redirect("/cadastro_invalido");
        } else {
            const insert = "INSERT INTO users (username, password) VALUES (?, ?)";
            db.run(insert, [username, password], (err) => {
                if (err) throw err;

                console.log(`Usuário: ${username} cadastro com sucesso.`);
                res.redirect("/cadastro_sucesso");
            });
        }
    });
});

app.get("/cadastro_sucesso", (req, res) => {
    res.render("pages/cadastro_sucesso", { titulo: "Cadastro com Sucesso", req: req });
});

app.get("/cadastro_invalido", (req, res) => {
    res.render("pages/cadastro_invalido", { titulo: "Cadastro Inválido", req: req });
});

app.post("/login", (req, res) => {
    console.log("POST /login");
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username=? AND password=?";
    db.get(query, [username, password], (err, row) => {
        if (err) throw err;

        if (row) {
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect("/dashboard");
        } else {
            res.redirect("/login_invalido");
        }
    });
});

app.get("/login", (req, res) => {
    console.log("GET /login");
    res.render("pages/login", { titulo: "Login", req: req });
});

app.get("/login_invalido", (req, res) => {
    res.render("pages/login_invalido", { titulo: "Login Inválido", req: req });
});

app.use('/{*erro}', (req, res) => {
    // Envia uma resposta de erro 404
    res.status(404).render('pages/fail', { titulo: "ERRO 404", req: req, msg: "404" });
  });
  
app.listen(3000, () => {
    console.log("Servidor NODEjs ativo na porta 3000");
});
