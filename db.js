import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from "dotenv";
import csv from "csvtojson";


dotenv.config({ path: './.env/.env' });


const app = express();


// --------------------------------------------------------------------------------------
// CONFIGURAÇÕES

app.use(express.json({ limit: '50mb' }));


// --------------------------------------------------------------------------------------
// CRENDENCIAIS

const pool = mysql.createPool({
  host: 'srv1073.hstgr.io',
  user: 'u771906953_barreto',
  password: 'MQPj3:6GY_hFfjA',
  database: 'u771906953_barreto',
  port: 3306,
});

// --------------------------------------------------------------------------------------
// PERMISSOES DO SITE

const corsOptions = {
  origin: "*",
  methods: ['GET', 'POST', 'DELETE','PUT'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));



// --------------------------------------------------------------------------------------
// ROTA DE POST
app.post("/input", async (req, res) => {
  const { pessoa, lat, lon, foto } = req.body;

  if (!foto) {
    return res.status(400).json({ error: "Nenhuma foto recebida" });
  }

  try {
    const fotoBuffer = Buffer.from(foto.split(",")[1], "base64");

    const query = "INSERT INTO u771906953_barreto.localizacoes (pessoa, lat, lon, foto) VALUES (?, ?, ?, ?)";
    
    pool.query(query, [pessoa, lat, lon, fotoBuffer], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao salvar no banco de dados", details: err });
      }
      res.status(200).json({ message: "Localização e foto recebidas com sucesso!", data: results });
    });

  } catch (err) {
    console.error("Erro ao salvar a foto:", err);
    res.status(500).json({ error: "Erro ao processar a foto", details: err.message });
  }
});


// --------------------------------------------------------------------------------------
// GET DA BASE

app.get("/localizacoes", async (req, res) => {

  try {
    const query = "SELECT * FROM u771906953_barreto.localizacoes";
    
    pool.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao buscar dados no banco de dados", details: err });
      }

      // Convertendo imagens para Base64 na resposta
      const formattedResults = results.map((row) => ({
        ...row,
        foto: row.foto ? `data:image/jpeg;base64,${row.foto.toString("base64")}` : null
      }));

      res.status(200).json({ data: formattedResults });
    });

  } catch (err) {
    console.error("Erro ao consultar as localizações:", err);
    res.status(500).json({ error: "Erro ao consultar as localizações", details: err.message });
  }
});

// --------------------------------------------------------------------------------------
// CARREGAR TEMAS

app.get("/tema/:empresa", async (req, res) => {
  const empresa = req.params.empresa;

  if (!empresa) {
    return res.status(400).json({ error: "Empresa não informada." });
  }

  try {
    const query = "SELECT * FROM u771906953_barreto.tb_temas WHERE empresa = ?";
    
    pool.query(query, [empresa], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao buscar dados no banco de dados", details: err });
      }
      res.status(200).json({ data: results });
    });

  } catch (err) {
    console.error("Erro ao consultar temas:", err);
    res.status(500).json({ error: "Erro ao consultar tema", details: err.message });
  }
});


// --------------------------------------------------------------------------------------
// INSERIR AGENDAMENTO

app.post("/input_agendamento", async (req, res) => {


  const { nome, procedimento, data, hora_inicio, hora_fim, profissional, empresa, valor } = req.body;

  try {

    const query = `

      INSERT INTO u771906953_barreto.tb_agenda (nome, procedimento, data, hora_inicio, hora_fim, profissional, empresa, valor) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)

    `;

    pool.query(query, [nome, procedimento, data, hora_inicio, hora_fim, profissional, empresa, valor ], (err, results) => {
      if (err) {
        console.error("Erro ao salvar no banco de dados:", err);
        return res.status(500).json({ 
          error: "Erro ao salvar no banco de dados", 
          details: err.sqlMessage || err.message 
        });
      }
      res.status(200).json({ message: "Agendamento salvo com sucesso!", data: results });
    });

  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar", details: err.message });
  }
});




// --------------------------------------------------------------------------------------
// AGENDAMENTO FILTRADO

app.get("/filtrar_agendamentos/:empresa", async (req, res) => {
  const empresa = req.params.empresa;

  if (!empresa) {
    return res.status(400).json({ error: "Empresa não fornecida." });
  }

  try {
    const query = `
      SELECT 
        u771906953_barreto.tb_agenda.id,
        u771906953_barreto.tb_agenda.nome,
        u771906953_barreto.tb_agenda.procedimento,
        u771906953_barreto.tb_agenda.data,
        u771906953_barreto.tb_agenda.hora_inicio,
        u771906953_barreto.tb_agenda.hora_fim,
        u771906953_barreto.tb_agenda.profissional,
        u771906953_barreto.tb_agenda.empresa,
        u771906953_barreto.tb_agenda.valor,
        u771906953_barreto.tb_profissional.cor
      FROM 
        u771906953_barreto.tb_agenda
      JOIN 
        u771906953_barreto.tb_profissional 
        ON u771906953_barreto.tb_agenda.profissional = u771906953_barreto.tb_profissional.profissional
      WHERE 
        u771906953_barreto.tb_agenda.empresa = ?;
    `;

    pool.query(query, [empresa], (err, results) => {
      if (err) {
        console.error("Erro ao filtrar agendamentos:", err);
        return res.status(500).json({
          error: "Erro ao filtrar agendamentos",
          details: err.sqlMessage || err.message,
        });
      }
      res.status(200).json({ data: results });
    });
  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar", details: err.message });
  }
});


// --------------------------------------------------------------------------------------
// DELETAR AGENDAMENTO

app.delete("/delete_agendamento/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "DELETE FROM u771906953_barreto.tb_agenda WHERE id = ?";
    
    pool.query(query, [id], (err, results) => {
      if (err) {
        console.error("Erro ao excluir agendamento:", err);
        return res.status(500).json({ error: "Erro ao excluir agendamento", details: err.sqlMessage || err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      res.status(200).json({ message: "Agendamento excluído com sucesso!" });
    });

  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar a requisição", details: err.message });
  }
});

// --------------------------------------------------------------------------------------
// DELETAR CLIENTE

app.delete('/delete/:id', (req, res) => {
  const pacienteId = req.params.id;

  res.header('Access-Control-Allow-Origin', '*');
  
  const query = 'DELETE FROM u771906953_barreto.tb_pacientes WHERE id = ?';
  
  pool.query(query, [pacienteId], (err, result) => {
      if (err) {
          console.error("Erro no banco:", err);
          return res.status(500).json({ 
              success: false,
              error: err.sqlMessage 
          });
      }

      res.status(200)
         .json({ success: true, message: 'Excluído com sucesso' })
         .end();
  });
});

// --------------------------------------------------------------------------------------
// ATUALIZAR CADASTRO

app.put('/update_cadastro/:id', (req, res) => {

  const { id } = req.params;

  const { nome, data_nascimento, telefone, genero } = req.body;

  pool.query(

    'UPDATE u771906953_barreto.tb_pacientes SET nome = ?, data_nascimento = ?, telefone = ?, genero = ? WHERE id = ?',

    [nome, data_nascimento, telefone, genero, id],

    (err, result) => {

      if (err) {
        console.error("Erro ao atualizar paciente:", err);

        return res.status(500).json({ message: 'Erro ao atualizar o paciente.', details: err.message });
      }

      if (result.affectedRows === 0) {

        return res.status(404).json({ message: 'Paciente não encontrado.' });
      }

      res.json({ message: 'Paciente atualizado com sucesso.' });

    }

  );

});


// --------------------------------------------------------------------------------------
// CADASTRAR PACIENTE

app.post("/input_paciente", async (req, res) => {
  const { nome, data_nascimento, telefone, genero, empresa} = req.body;

  try {
    const query = `
      INSERT INTO u771906953_barreto.tb_pacientes (nome, data_nascimento, telefone, genero, empresa) 
      VALUES (?, ?, ?, ?, ?)
    `;

    pool.query(query, [nome, data_nascimento, telefone, genero, empresa], (err, results) => {
      if (err) {
        console.error("Erro ao salvar no banco de dados:", err);
        return res.status(500).json({ 
          error: "Erro ao Cadastrar", 
          details: err.sqlMessage || err.message 
        });
      }
      res.status(200).json({ message: "Cadastro salvo com sucesso!", data: results });
    });

  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar", details: err.message });
  }
});

// --------------------------------------------------------------------------------------
// LISTA DE PACIENTES

app.get("/lista_pacientes/:empresa", async (req, res) => {
  const empresa = req.params.empresa;

  if (!empresa) {
    return res.status(400).json({ error: "Empresa não informada." });
  }

  try {
    const query = "SELECT * FROM u771906953_barreto.tb_pacientes WHERE empresa = ?";
    
    pool.query(query, [empresa], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao buscar dados no banco de dados", details: err });
      }
      res.status(200).json({ data: results });
    });

  } catch (err) {
    console.error("Erro ao consultar pacientes:", err);
    res.status(500).json({ error: "Erro ao consultar pacientes", details: err.message });
  }
});


// --------------------------------------------------------------------------------------
// CADASTRAR PROFISSIONAL

app.post("/input_profissional", async (req, res) => {

  const {profissional, empresa, telefone, cor} = req.body;


  try {
    const query = `
      INSERT INTO u771906953_barreto.tb_profissional (profissional, empresa, telefone, cor) 
      VALUES (?, ?, ?, ?)
    `;

    pool.query(query, [profissional, empresa, telefone, cor], (err, results) => {

      if (err) {

        console.error("Erro ao salvar no banco de dados:", err);

        return res.status(500).json({ 

          error: "Erro ao Cadastrar", 

          details: err.sqlMessage || err.message 
        });
      }
      res.status(200).json({ message: "Cadastro salvo com sucesso!", data: results });
    });

  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar", details: err.message });
  }
});

// --------------------------------------------------------------------------------------
// ATUALIZAR CADASTRO

app.put('/update_profissional/:profissionalId', (req, res) => {

  const { profissionalId  } = req.params;

  const { profissional, telefone, cor } = req.body;

  pool.query(

    'UPDATE u771906953_barreto.tb_profissional SET profissional = ?, telefone = ?, cor = ? WHERE id = ?',

    [profissional, telefone, cor, profissionalId ],

    (err, result) => {

      if (err) {
        console.error("Erro ao atualizar paciente:", err);

        return res.status(500).json({ message: 'Erro ao atualizar o paciente.', details: err.message });
      }

      if (result.affectedRows === 0) {

        return res.status(404).json({ message: 'Paciente não encontrado.' });
      }

      res.json({ message: 'Paciente atualizado com sucesso.' });

    }

  );

});

// --------------------------------------------------------------------------------------
// LISTA DE PROFISSIONAIS

app.get("/lista_profissional/:empresa", async (req, res) => {
  const empresa = req.params.empresa; // Pegando empresa da URL

  if (!empresa) {
    return res.status(400).json({ error: "Empresa não fornecida." });
  }

  try {
    const query = "SELECT * FROM u771906953_barreto.tb_profissional WHERE empresa = ?";
    
    pool.query(query, [empresa], (err, results) => {
      if (err) {
        console.error("Erro ao buscar profissionais:", err);
        return res.status(500).json({ 
          error: "Erro ao buscar profissionais", 
          details: err.sqlMessage || err.message 
        });
      }
      res.status(200).json({ data: results });
    });

  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar", details: err.message });
  }
});

// --------------------------------------------------------------------------------------
// DELETAR PROFISSIONAL

app.delete('/delete_profissional/:id', (req, res) => {
  const profissionalId = req.params.id;

  res.header('Access-Control-Allow-Origin', '*');
  
  const query = 'DELETE FROM u771906953_barreto.tb_profissional WHERE id = ?';
  
  pool.query(query, [profissionalId], (err, result) => {
      if (err) {
          console.error("Erro no banco:", err);
          return res.status(500).json({ 
              success: false,
              error: err.sqlMessage 
          });
      }

      res.status(200)
         .json({ success: true, message: 'Excluído com sucesso' })
         .end();
  });
});

// --------------------------------------------------------------------------------------
// LISTA DE PROCEDIMENTOS

app.get("/lista_procedimento/:empresa", async (req, res) => {

  const empresa = req.params.empresa;

  if (!empresa) {
    return res.status(400).json({ error: "Empresa não fornecida." });
  }

  try {
    const query = "SELECT * FROM u771906953_barreto.tb_servicos WHERE empresa = ?";
    
    pool.query(query, [empresa], (err, results) => {
      if (err) {
        console.error("Erro ao buscar profissionais:", err);
        return res.status(500).json({ 
          error: "Erro ao buscar profissionais", 
          details: err.sqlMessage || err.message 
        });
      }
      res.status(200).json({ data: results });
    });

  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar", details: err.message });
  }
});

// --------------------------------------------------------------------------------------
// CADASTRAR SERVICO

app.post("/input_servico", async (req, res) => {
  const { procedimento, empresa, valor} = req.body;

  try {
    const query = `
      INSERT INTO u771906953_barreto.tb_servicos (procedimento, empresa,valor) 
      VALUES (?, ?, ?)
    `;

    pool.query(query, [procedimento, empresa, valor], (err, results) => {
      if (err) {
        console.error("Erro ao salvar no banco de dados:", err);
        return res.status(500).json({ 
          error: "Erro ao Cadastrar", 
          details: err.sqlMessage || err.message 
        });
      }
      res.status(200).json({ message: "Cadastro salvo com sucesso!", data: results });
    });

  } catch (err) {
    console.error("Erro ao processar a requisição:", err);
    res.status(500).json({ error: "Erro ao processar", details: err.message });
  }
});

// --------------------------------------------------------------------------------------
// DELETAR SERVICO

app.delete('/delete_servico/:id', (req, res) => {
  const servicoID = req.params.id;

  res.header('Access-Control-Allow-Origin', '*');
  
  const query = 'DELETE FROM u771906953_barreto.tb_servicos WHERE id = ?';
  
  pool.query(query, [servicoID], (err, result) => {
      if (err) {
          console.error("Erro no banco:", err);
          return res.status(500).json({ 
              success: false,
              error: err.sqlMessage 
          });
      }

      res.status(200)
         .json({ success: true, message: 'Excluído com sucesso' })
         .end();
  });
});

// --------------------------------------------------------------------------------------
// ATUALIZAR SERVICO

app.put('/update_procedimento/:servicoId', (req, res) => {

  const { servicoId } = req.params;

  const { procedimento, valor } = req.body;

  pool.query(

    'UPDATE u771906953_barreto.tb_servicos SET procedimento = ?, valor = ? WHERE id = ?',

    [procedimento, valor, servicoId ],

    (err, result) => {

      if (err) {
        console.error("Erro ao atualizar serviço:", err);

        return res.status(500).json({ message: 'Erro ao atualizar o serviço.', details: err.message });
      }

      if (result.affectedRows === 0) {

        return res.status(404).json({ message: 'Paciente não encontrado.' });
      }

      res.json({ message: 'Paciente atualizado com sucesso.' });

    }

  );

});


// --------------------------------------------------------------------------------------
// LOGIN

app.post("/login", async (req, res) => {

  const { usuario, senha } = req.body;
  
  const url = process.env.PLANILHA_URL;

  try {
    const response = await fetch(url);
    const csvText = await response.text();
    const usuarios = await csv().fromString(csvText);

    const user = usuarios.find(u => u.user === usuario && u.password === senha);

    if (user) {
      delete user.password;
      return res.status(200).json({ success: true, user });
    } else {
      return res.status(401).json({ success: false, message: "Usuário ou senha inválidos" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: "Erro ao processar login" });
  }
});

// --------------------------------------------------------------------------------------
// INICIAR SERVIDOR
const port = 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});