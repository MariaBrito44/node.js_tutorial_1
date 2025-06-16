// Importa os módulos necessários
const express = require("express"); // Framework web
const session = require("express-session"); // Gerenciamento de sessões
const sqlite3 = require("sqlite3"); // Banco de dados SQLite
const helmet = require("helmet"); // Segurança de cabeçalhos HTTP
const cors = require("cors"); // Permitir requisições de outras origens
const bodyParser = require('body-parser'); // Parser de corpo de requisições
const { body, validationResult } = require("express-validator"); // Validação e sanitização de dados

// Inicializa a aplicação Express
const app = express();

// Aplica middleware de segurança
app.use(helmet());

// Configura CORS 
app.use(cors({
  origin: ["https://www.bing.com/","https://www.google.com"]
}));

// Configura o parser para JSON com limite de 3mb
app.use(bodyParser.json({ limit: "3mb" }));

// Conecta ao banco SQLite local chamado "users.db"
const db = new sqlite3.Database("users.db");

// Criação das tabelas se não existirem
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, perfil TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, id_users INTEGER, titulo TEXT, conteudo TEXT, data_criacao TEXT)"
  );
});

// Configuração do gerenciamento de sessão
app.use(
  session({
    secret: "senhaforte", // Chave usada para criptografar a sessão
    resave: true, // Força a gravação da sessão mesmo sem alterações
    saveUninitialized: true // Salva sessões novas mesmo que não modificadas
  })
);

// Serve arquivos estáticos da pasta "static"
app.use("/static", express.static(__dirname + "/static"));

// Permite interpretar dados enviados por formulários HTML
app.use(express.urlencoded({ extended: true }));

// Define EJS como mecanismo de template
app.set("view engine", "ejs");


// ---------- ROTAS ---------- //

// Página inicial — exibe posts
app.get("/", (req, res) => {
  console.log("GET /");
  const query = "SELECT * FROM posts";
  db.all(query, [], (err, rows) => {
    if (err) throw(err); // Passa erro para middleware de erro
    res.render("pages/index", { titulo: "Index", dados: rows, req: req });
  });
});

// Página "Sobre"
app.get("/sobre", (req, res) => {
  res.render("pages/sobre", { titulo: "Sobre", req: req });
});

// Dashboard - acessível apenas a usuários logados
app.get("/dashboard", (req, res) => {
  console.log("GET /dashboard");
  if (req.session.loggedin) {
    const query = "SELECT * FROM users";
    db.all(query, [], (err, rows) => {
      if (err) throw(err);
      res.render("pages/dashboard", { titulo: "Dashboard", dados: rows, req: req });
    });
  } else {
    res.redirect("/nao_autorizado");
  }
});

// Página de acesso negado
app.get("/nao_autorizado", (req, res) => {
  res.render("pages/nao_autorizado", { titulo: "Não autorizado", req: req });
});

// Página de criação de post (só logado)
app.get("/post_create", (req, res) => {
  console.log("GET /post_create");
  if (req.session.loggedin) {
    res.render("pages/post_form", { titulo: "Criar postagem", req: req, errors: null, data: {} });
  } else {
    res.redirect("/nao_autorizado");
  }
});

// POST para criação de post (com verificação de login)
app.post("/post_create", (req, res) => {
  console.log("POST /post_create");
  if (req.session.loggedin) {
    const { titulo, conteudo } = req.body;
    const data = new Date().toLocaleDateString();
    const query = "INSERT INTO posts (id_users, titulo, conteudo, data_criacao) VALUES (?,?,?,?)";

    db.get(query, [req.session.id_username, titulo, conteudo, data], (err) => {
      if (err) throw err;
      res.redirect('/');
    });
  } else {
    res.redirect("/nao_autorizado");
  }
});

// Logout: destrói a sessão
app.get("/logout", (req, res) => {
  console.log("GET /logout");
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Página de cadastro (GET)
app.get("/cadastro", (req, res) => {
  console.log("GET /cadastro");
  res.render("pages/cadastro", {
    titulo: "Cadastro",
    req: req,
    errors: null,
    data: {}
  });
});

// POST de cadastro com validação de dados
app.post("/cadastro",(req, res) => {
    

    const { username, password, perfil } = req.body;

    // Verifica se o usuário já existe
    const query = "SELECT * FROM users WHERE username=?";
    db.get(query, [username], (err, row) => {
      if (err) return next(err);

      if (row) {
        console.log(`Usuário: ${username} já cadastrado`);
        return res.redirect("/cadastro_invalido");
      }

      // Insere novo usuário com perfil padrão "visualizador"
      const insert = "INSERT INTO users (username, password, perfil) VALUES (?, ?, 'visualizador')";
      db.run(insert, [username, password, perfil], (err) => {
        if (err) return next(err);
        console.log(`Usuário: ${username} cadastrado com sucesso.`);
        res.redirect("/cadastro_sucesso");
      });
    });
  }
);

// Feedbacks de cadastro
app.get("/cadastro_invalido", (req, res) => {
  res.render("pages/cadastro_invalido", { titulo: "Erro no Cadastro", req: req });
});

app.get("/cadastro_sucesso", (req, res) => {
  res.render("pages/cadastro_sucesso", { titulo: "Cadastro Concluído", req: req });
});

// POST de login com validação
app.post("/login", (req, res) => {
    console.log("POST /login");
    const { username, password, perfil } = req.body;
    const query = "SELECT * FROM users WHERE username=? AND password=?";

    db.get(query, [username, password], (err, row) => {
      if (err) throw(err);

      if (row) {
        // Login bem-sucedido: armazena dados na sessão
        req.session.loggedin = true;
        req.session.username = username;
        req.session.id_username = row.id;

        if (row.perfil === "adm") {
          req.session.adm = true;
          res.redirect("/dashboard");
        } else {
          req.session.adm = false;
          res.redirect("/");
        }
      } else {
        res.redirect("/invalido");
      }
    });
  }
);

// Página de login (GET)
app.get("/login", (req, res) => {
  console.log("GET /login");
  res.render("pages/login", { titulo: "Login", req: req, errors: null, data: {} });
});

// Página de login inválido
app.get("/invalido", (req, res) => {
  res.render("pages/invalido", { titulo: "Inválido", req: req });
});

// Middleware 404 para rotas não encontradas
app.use((req, res) => {
  res.status(404).render("pages/fail", { titulo: "ERRO 404", req: req, msg: "Página não encontrada" });
});

// Inicializa o servidor
app.listen(3000, () => {
  console.log("Servidor NODEjs ativo na porta 3000");
});
