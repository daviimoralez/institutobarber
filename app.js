const express = require('express');
const app = express();
const path = require('path');

// Middleware estático para servir arquivos da pasta client
app.use(express.static(path.join(__dirname, '..', 'client')));

// Rota para servir o arquivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
