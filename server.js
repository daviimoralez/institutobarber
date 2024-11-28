const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Inicializar o banco de dados
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    // Criar a tabela de usuários se não existir
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT,
      email TEXT UNIQUE,
      cpf TEXT UNIQUE,
      phone TEXT,
      password TEXT
    )`);

    // Criar a tabela de agendamentos se não existir
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      start TEXT
    )`);

    // Criar a tabela de administradores se não existir
    db.run(`CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`);
  }
});

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware para analisar JSON
app.use(express.json());

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'client')));

// Rota para a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Rota para cadastro de usuário
app.post('/register', async (req, res) => {
  const { fullname, email, cpf, phone, password } = req.body;
  console.log('Dados recebidos:', { fullname, email, cpf, phone, password });

  const checkQuery = 'SELECT * FROM users WHERE email = ? OR cpf = ?';
  db.get(checkQuery, [email, cpf], async (err, user) => {
    if (err) {
      console.error('Erro ao verificar usuário:', err.message);
      return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }

    if (user) {
      console.log('Email ou CPF já cadastrados.');
      return res.status(400).json({ message: 'Email ou CPF já cadastrados' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('Senha criptografada:', hashedPassword);
      const query = 'INSERT INTO users (fullname, email, cpf, phone, password) VALUES (?, ?, ?, ?, ?)';
      db.run(query, [fullname, email, cpf, phone, hashedPassword], function(err) {
        if (err) {
          console.error('Erro ao registrar usuário:', err.message);
          res.status(500).send('Erro no servidor, tente novamente mais tarde.');
        } else {
          console.log('Usuário registrado com sucesso!');
          res.status(201).send('Usuário registrado com sucesso!');
        }
      });
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      res.status(500).send('Erro ao registrar usuário');
    }
  });
});

// Rota para login de usuário
app.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  console.log('Dados de login recebidos:', { identifier, password });

  const query = 'SELECT * FROM users WHERE email = ? OR cpf = ?';
  db.get(query, [identifier, identifier], async (err, user) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err.message);
      return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }

    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }

    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        res.status(200).json({ message: 'Login bem-sucedido' });
      } else {
        res.status(401).send('Senha incorreta');
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }
  });
});

// Rota para login de administrador
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  console.log('Dados de login do administrador recebidos:', { username, password });

  const query = 'SELECT * FROM admins WHERE username = ?';
  db.get(query, [username], async (err, admin) => {
    if (err) {
      console.error('Erro ao buscar administrador:', err.message);
      return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }

    if (!admin) {
      return res.status(404).send('Administrador não encontrado');
    }

    try {
      const match = await bcrypt.compare(password, admin.password);
      if (match) {
        res.status(200).json({ message: 'Login de administrador bem-sucedido' });
      } else {
        res.status(401).send('Senha incorreta');
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }
  });
});

// Rota para obter dados do cliente
app.get('/api/profile', (req, res) => {
  const email = req.query.email; // Supondo que o email seja usado para identificar o usuário logado
  const query = 'SELECT fullname, email, cpf, phone FROM users WHERE email = ?';
  db.get(query, [email], (err, user) => {
    if (err) {
      console.error('Erro ao obter dados do cliente:', err.message);
      return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }

    if (!user) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.json(user);
  });
});

// Rota para atualizar dados do cliente
app.put('/api/profile', (req, res) => {
  const { fullname, email, cpf, phone, password } = req.body;
  const query = 'UPDATE users SET fullname = ?, cpf = ?, phone = ? WHERE email = ?';

  db.run(query, [fullname, cpf, phone, email], function(err) {
    if (err) {
      console.error('Erro ao atualizar dados do cliente:', err.message);
      return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }
    if (password) {
      const updatePasswordQuery = 'UPDATE users SET password = ? WHERE email = ?';
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Erro ao criptografar a senha:', err.message);
          return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
        }
        db.run(updatePasswordQuery, [hashedPassword, email], function(err) {
          if (err) {
            console.error('Erro ao atualizar a senha do cliente:', err.message);
            return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
          }
          res.status(200).send('Informações atualizadas com sucesso!');
        });
      });
    } else {
      res.status(200).send('Informações atualizadas com sucesso!');
    }
  });
});

// Rota para obter agendamentos
app.get('/api/appointments', (req, res) => {
  const query = 'SELECT title, start FROM appointments';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao obter agendamentos:', err.message);
      return res.status(500).send('Erro no servidor, tente novamente mais tarde.');
    }
    res.json(rows);
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Middleware para lidar com erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo deu errado!');
});
