const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3");
const { body, validationResult } = require("express-validator");

const app = express();

// Conexão com o banco de dados SQLite
const db = new sqlite3.Database("users.db");

// Criação das tabelas, caso não existam
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, id_users INTEGER, titulo TEXT, conteudo TEXT, data_criacao TEXT)"
  );
});

// Configuração da sessão para controlar login dos usuários
app.use(
  session({
    secret: "senhaforte",
    resave: true,
    saveUninitialized: true,
  })
);

// Configura pasta para arquivos estáticos (css, imagens, js)
app.use("/static", express.static(__dirname + "/static"));

// Habilita o parse do body para dados vindos em formulários HTML
app.use(express.urlencoded({ extended: true }));

// Define o motor de template EJS para as views
app.set("view engine", "ejs");

// --- Rotas ---

app.get("/", (req, res) => {
  console.log("GET /");
  res.render("pages/index", { titulo: "Index", req: req });
});

app.get("/sobre", (req, res) => {
  res.render("pages/sobre", { titulo: "Sobre", req: req });
});

app.get("/dashboard", (req, res, next) => {
  console.log("GET /dashboard");
  if (req.session.loggedin) {
    const query = "SELECT * FROM users";
    db.all(query, [], (err, rows) => {
      if (err) return next(err);
      res.render("pages/dashboard", { titulo: "Dashboard", dados: rows, req: req });
    });
  } else {
    res.redirect("/nao_autorizado");
  }
});

app.get("/nao_autorizado", (req, res) => {
  res.render("pages/nao_autorizado", { titulo: "Não autorizado", req: req });
});

app.get("/post_create", (req, res) => {
  console.log("GET /post_create");
  if (req.session.loggedin) {
    res.render("pages/post_form", { titulo: "Criar postagem", req: req, errors: null, data: {} });
  } else {
    res.redirect("/nao_autorizado");
  }
});

app.post(
  "/post_create",
  [
    body("titulo").trim().notEmpty().withMessage("Título é obrigatório").escape(),
    body("conteudo").trim().notEmpty().withMessage("Conteúdo é obrigatório").escape(),
  ],
  (req, res, next) => {
    console.log("POST /post_create");

    if (!req.session.loggedin) {
      return res.redirect("/nao_autorizado");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("pages/post_form", {
        titulo: "Criar postagem",
        req: req,
        errors: errors.array(),
        data: req.body,
      });
    }

    const { titulo, conteudo } = req.body;
    const data_criacao = new Date().toISOString();

    const query = "INSERT INTO posts (id_users, titulo, conteudo, data_criacao) VALUES (?, ?, ?, ?)";
    // Corrigido para pegar id do usuário logado da sessão
    db.run(query, [req.session.id_username, titulo, conteudo, data_criacao], (err) => {
      if (err) return next(err);
      res.send("Post criado com sucesso!");
    });
  }
);

app.get("/logout", (req, res) => {
  console.log("GET /logout");
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/cadastro", (req, res) => {
  console.log("GET /cadastro");
  res.render("pages/cadastro", { titulo: "Cadastro", req: req, errors: null, data: {} });
});

app.post(
  "/cadastro",
  [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Nome de usuário obrigatório")
      .isAlphanumeric()
      .withMessage("Nome de usuário deve ser alfanumérico")
      .escape(),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("Senha obrigatória")
      .isLength({ min: 6 })
      .withMessage("Senha deve ter ao menos 6 caracteres")
      .escape(),
  ],
  (req, res, next) => {
    console.log("POST /cadastro");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("pages/cadastro", {
        titulo: "Cadastro",
        errors: errors.array(),
        data: req.body,
        req: req,
      });
    }

    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username=?";

    db.get(query, [username], (err, row) => {
      if (err) return next(err);

      if (row) {
        console.log(`Usuário: ${username} já cadastrado`);
        return res.redirect("/Cadastrado");
      }

      const insert = "INSERT INTO users (username, password) VALUES (?, ?)";
      db.run(insert, [username, password], (err) => {
        if (err) return next(err);
        console.log(`Usuário: ${username} cadastrado com sucesso.`);
        res.redirect("/sucesso");
      });
    });
  }
);

app.get("/Cadastrado", (req, res) => {
  res.render("pages/jacadastrado", { titulo: "Cadastrado", req: req });
});

app.get("/sucesso", (req, res) => {
  res.render("pages/sucesso", { titulo: "Sucesso", req: req });
});

app.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Nome de usuário obrigatório").escape(),
    body("password").trim().notEmpty().withMessage("Senha obrigatória").escape(),
  ],
  (req, res, next) => {
    console.log("POST /login");

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("pages/login", {
        titulo: "Login",
        errors: errors.array(),
        data: req.body,
        req: req,
      });
    }

    const { username, password } = req.body;
    const query = "SELECT * FROM users WHERE username=? AND password=?";

    db.get(query, [username, password], (err, row) => {
      if (err) return next(err);

      if (row) {
        req.session.loggedin = true;
        req.session.username = username;
        req.session.id_username = row.id;
        res.redirect("/dashboard");
      } else {
        res.redirect("/invalido");
      }
    });
  }
);

app.get("/login", (req, res) => {
  console.log("GET /login");
  res.render("pages/login", { titulo: "Login", req: req, errors: null, data: {} });
});

app.get("/invalido", (req, res) => {
  res.render("pages/invalido", { titulo: "Inválido", req: req });
});

// *** ROTA DE PAGINAÇÃO DE POSTS ***
app.get("/posts", (req, res, next) => {
  if (!req.session.loggedin) {
    return res.redirect("/nao_autorizado");
  }

  const perPage = 5;
  const page = parseInt(req.query.page) || 1;

  db.get("SELECT COUNT(*) AS count FROM posts", (err, row) => {
    if (err) return next(err);

    const totalPosts = row.count;
    const totalPages = Math.ceil(totalPosts / perPage);
    const offset = (page - 1) * perPage;

    const query = `
      SELECT posts.*, users.username
      FROM posts
      LEFT JOIN users ON posts.id_users = users.id
      ORDER BY data_criacao DESC
      LIMIT ? OFFSET ?
    `;

    db.all(query, [perPage, offset], (err, rows) => {
      if (err) return next(err);

      res.render("pages/posts_list", {
        titulo: "Posts",
        posts: rows,
        currentPage: page,
        totalPages: totalPages,
        req: req,
      });
    });
  });
});

// Middleware para rota não encontrada (404)
app.use((req, res) => {
  res.status(404).render("pages/fail", { titulo: "ERRO 404", req: req, msg: "Página não encontrada" });
});

// Middleware para tratamento centralizado de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500);
  res.render("pages/error", {
    titulo: "Erro",
    mensagem: err.message || "Erro interno do servidor",
    req: req,
  });
});

app.listen(3000, () => {
  console.log("Servidor NODEjs ativo na porta 3000");
});
