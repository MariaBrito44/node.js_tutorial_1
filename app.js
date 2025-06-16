const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require('body-parser')
const { body, validationResult } = require("express-validator"); // Biblioteca para validação e sanitização

const app = express();
app.use(helmet())
app.use(cors({
  origin: "https://google.com.br",
  origin: "https://www.bing.com/"
}))
app.use(bodyParser.json({limit: "3mb"}))

// Conexão com o banco de dados SQLite
const db = new sqlite3.Database("users.db");


// Criação das tabelas, caso não existam
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, perfil TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, id_users INTEGER, titulo TEXT, conteudo TEXT, data_criacao TEXT)"
  );
 
});

// Configuração da sessão para controlar login dos usuários
app.use(
  session({
    secret: "senhaforte", // Chave secreta para a sessão
    resave: true,          // Regrava a sessão mesmo sem modificações (pode ajustar conforme necessidade)
    saveUninitialized: true, // Salva sessões novas mesmo sem dados (pode ajustar conforme necessidade)
  })
);

// Configura pasta para arquivos estáticos (css, imagens, js)
app.use("/static", express.static(__dirname + "/static"));

// Habilita o parse do body para dados vindos em formulários HTML (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Define o motor de template EJS para as views
app.set("view engine", "ejs");

// --- Rotas ---

// Rota principal
app.get("/", (req, res) => {
  console.log("GET /")
  const query = "SELECT * FROM posts";
    // Busca todos usuários para exibir no dashboard
    db.all(query, [], (err, rows) => {
      if (err) return next(err); // Passa erro para o middleware de erro centralizado
      res.render("pages/index", { titulo: "Index", dados: rows, req: req })
    })
  } 
);

// Rota sobre
app.get("/sobre", (req, res) => {
  res.render("pages/sobre", { titulo: "Sobre", req: req });
});

// Rota dashboard — só acessível se usuário estiver logado
app.get("/dashboard", (req, res, next) => {
  console.log("GET /dashboard");
  if (req.session.loggedin) {
    const query = "SELECT * FROM users";
    // Busca todos usuários para exibir no dashboard
    db.all(query, [], (err, rows) => {
      if (err) return next(err); // Passa erro para o middleware de erro centralizado
      res.render("pages/dashboard", { titulo: "Dashboard", dados: rows, req: req });
    });
  } else {
    res.redirect("/nao_autorizado");
  }
});

// Página para acesso não autorizado
app.get("/nao_autorizado", (req, res) => {
  res.render("pages/nao_autorizado", { titulo: "Não autorizado", req: req });
});

// Página de formulário para criação de post - só para usuários logados
app.get("/post_create", (req, res) => {
  console.log("GET /post_create");
  if (req.session.loggedin) {
    // Passa objeto vazio de erros e dados para a view, para o formulário funcionar bem
    res.render("pages/post_form", { titulo: "Criar postagem", req: req, errors: null, data: {} });
  } else {
    res.redirect("/nao_autorizado");
  }
});

// POST para criação de post com validação dos dados
app.post("/post_create",(req,res) => {
    console.log("POST /post_create");
    //Pegar dados da postagem: User ID, Título Postagem, Conteúdo da Postagem
    //req.session.username req.session.id_username
    if(req.session.loggedin){
        console.log("Dados da postagem: ", req.body)
        const {titulo,conteudo} = req.body;
        console.log("Username: ", req.session.username, " id_username: ",req.session.id_username)
        const data_criacao = new Date();
        const data = data_criacao.toLocaleDateString();
        const query = "INSERT INTO posts (id_users, titulo, conteudo, data_criacao) VALUES (?,?,?,?)"
        db.get(query, [req.session.id_username,titulo,conteudo,data], (err)=>{
            if(err) throw err;
            res.redirect('/');
        })
        //res.send("Criação da postagem.. Em construção..")
    }else{
        res.redirect("/nao_autorizado")
    }
});

// Rota logout — destrói sessão e redireciona
app.get("/logout", (req, res) => {
  console.log("GET /logout");
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Página de cadastro - GET
app.get("/cadastro", (req, res) => {
  console.log("GET /cadastro");
  res.render("pages/cadastro", {
    titulo: "Cadastro",
    req: req,
    errors: null,
    data: {}
  });
});

// POST para cadastro com validação
app.post(
  "/cadastro",
  [
    body("username")
      .trim()
      .notEmpty().withMessage("Nome de usuário obrigatório")

      .escape(),
    body("password")
      .trim()
      .notEmpty().withMessage("Senha obrigatória")
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
        req: req
      });
    }

    const { username, password,perfil } = req.body;

    const query = "SELECT * FROM users WHERE username=?";
    db.get(query, [username], (err, row) => {
      if (err) return next(err);

      if (row) {
        console.log(`Usuário: ${username} já cadastrado`);
        return res.redirect("/cadastro_invalido");
      }

      const insert = "INSERT INTO users (username, password, perfil) VALUES (?, ?,'visualizador')";
      db.run(insert, [username, password, perfil], (err) => {
        if (err) return next(err);
        console.log(`Usuário: ${username} cadastrado com sucesso.`);
        res.redirect("/cadastro_sucesso");
      });
    });
  }
);

// Páginas de feedback
app.get("/cadastro_invalido", (req, res) => {
  res.render("pages/cadastro_invalido", { titulo: "Erro no Cadastro", req: req });
});

app.get("/cadastro_sucesso", (req, res) => {
  res.render("pages/cadastro_sucesso", { titulo: "Cadastro Concluído", req: req });
});


// POST para login com validação
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
   // salva o cargo do usuário (admin ou user)
  res.redirect("/dashboard");
}
    });
  }
);

// Página login - envia vazio para formulário
app.get("/login", (req, res) => {
  console.log("GET /login");
  res.render("pages/login", { titulo: "Login", req: req, errors: null, data: {} });
});

// Página login inválido
app.get("/invalido", (req, res) => {
  res.render("pages/invalido", { titulo: "Inválido", req: req });
});

// Middleware para rota não encontrada (404)
app.use((req, res) => {
  res.status(404).render("pages/fail", { titulo: "ERRO 404", req: req, msg: "Página não encontrada" });
});


app.listen(3000, () => {
  console.log("Servidor NODEjs ativo na porta 3000");
});

