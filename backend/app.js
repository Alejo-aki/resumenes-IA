const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./models/database');

// Asegurar que el directorio de la base de datos exista
const dbDir = path.resolve(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',  // Permite solicitudes desde cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Rutas API

// GET /notebooks - Obtener todos los notebooks con sus clases
app.get('/notebooks', (req, res) => {
  db.all('SELECT * FROM notebooks', [], (err, notebooks) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Para cada notebook, obtener sus clases
    const promises = notebooks.map(notebook => {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM classes WHERE notebook_id = ?', [notebook.id], (err, classes) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              ...notebook,
              classes
            });
          }
        });
      });
    });
    
    Promise.all(promises)
      .then(results => {
        // Transformar a la estructura esperada por el frontend
        const formattedResults = {};
        results.forEach(notebook => {
          formattedResults[notebook.name] = notebook.classes.map(cls => ({
            transcription: cls.transcription,
            summary: cls.summary,
            timestamp: cls.timestamp
          }));
        });
        res.json(formattedResults);
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  });
});

// POST /notebooks - Agregar una nueva clase a un notebook
app.post('/notebooks', (req, res) => {
  const { notebookName, transcription, summary } = req.body;
  
  if (!notebookName) {
    return res.status(400).json({ error: 'El nombre del notebook es requerido' });
  }
  
  // Timestamp actual
  const timestamp = new Date().toLocaleString();
  
  // Primero verificar si el notebook existe
  db.get('SELECT id FROM notebooks WHERE name = ?', [notebookName], (err, notebook) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!notebook) {
      // Si no existe, crear el notebook
      db.run('INSERT INTO notebooks (name) VALUES (?)', [notebookName], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const notebookId = this.lastID;
        
        // Luego insertar la clase
        db.run(
          'INSERT INTO classes (notebook_id, transcription, summary, timestamp) VALUES (?, ?, ?, ?)',
          [notebookId, transcription, summary, timestamp],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
              id: this.lastID,
              notebookId,
              notebookName,
              transcription,
              summary,
              timestamp
            });
          }
        );
      });
    } else {
      // Si existe, solo insertar la clase
      db.run(
        'INSERT INTO classes (notebook_id, transcription, summary, timestamp) VALUES (?, ?, ?, ?)',
        [notebook.id, transcription, summary, timestamp],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({
            id: this.lastID,
            notebookId: notebook.id,
            notebookName,
            transcription,
            summary,
            timestamp
          });
        }
      );
    }
  });
});

// PUT /notebooks/:nombre/:index - Editar una clase específica
app.put('/notebooks/:nombre/:index', (req, res) => {
  const { nombre, index } = req.params;
  const { transcription, summary } = req.body;
  
  // Primero obtener el ID del notebook
  db.get('SELECT id FROM notebooks WHERE name = ?', [nombre], (err, notebook) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook no encontrado' });
    }
    
    // Obtener todas las clases del notebook
    db.all('SELECT * FROM classes WHERE notebook_id = ? ORDER BY id', [notebook.id], (err, classes) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const classIndex = parseInt(index);
      if (classIndex < 0 || classIndex >= classes.length) {
        return res.status(404).json({ error: 'Índice de clase no válido' });
      }
      
      const classToUpdate = classes[classIndex];
      
      // Actualizar la clase
      db.run(
        'UPDATE classes SET transcription = ?, summary = ? WHERE id = ?',
        [
          transcription !== undefined ? transcription : classToUpdate.transcription,
          summary !== undefined ? summary : classToUpdate.summary,
          classToUpdate.id
        ],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar la clase' });
          }
          
          res.json({
            id: classToUpdate.id,
            notebookId: notebook.id,
            notebookName: nombre,
            transcription: transcription !== undefined ? transcription : classToUpdate.transcription,
            summary: summary !== undefined ? summary : classToUpdate.summary,
            timestamp: classToUpdate.timestamp
          });
        }
      );
    });
  });
});

// DELETE /notebooks/:nombre/:index - Eliminar una clase específica
app.delete('/notebooks/:nombre/:index', (req, res) => {
  const { nombre, index } = req.params;
  
  // Primero obtener el ID del notebook
  db.get('SELECT id FROM notebooks WHERE name = ?', [nombre], (err, notebook) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook no encontrado' });
    }
    
    // Obtener todas las clases del notebook
    db.all('SELECT * FROM classes WHERE notebook_id = ? ORDER BY id', [notebook.id], (err, classes) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const classIndex = parseInt(index);
      if (classIndex < 0 || classIndex >= classes.length) {
        return res.status(404).json({ error: 'Índice de clase no válido' });
      }
      
      const classToDelete = classes[classIndex];
      
      // Eliminar la clase
      db.run('DELETE FROM classes WHERE id = ?', [classToDelete.id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'No se pudo eliminar la clase' });
        }
        
        // Verificar si quedan clases en el notebook
        db.get('SELECT COUNT(*) as count FROM classes WHERE notebook_id = ?', [notebook.id], (err, result) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Si no quedan clases, eliminar el notebook
          if (result.count === 0) {
            db.run('DELETE FROM notebooks WHERE id = ?', [notebook.id], function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              
              res.json({ message: 'Clase y notebook eliminados correctamente' });
            });
          } else {
            res.json({ message: 'Clase eliminada correctamente' });
          }
        });
      });
    });
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
