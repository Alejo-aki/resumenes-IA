const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear la conexión a la base de datos SQLite
const dbPath = path.resolve(__dirname, '../db/notebooks.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conexión exitosa a la base de datos SQLite');
    // Crear las tablas si no existen
    createTables();
  }
});

// Función para crear las tablas necesarias
function createTables() {
  // Tabla de notebooks
  db.run(`CREATE TABLE IF NOT EXISTS notebooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Error al crear la tabla notebooks:', err.message);
    } else {
      console.log('Tabla notebooks creada o ya existente');
    }
  });

  // Tabla de clases (relacionada con notebooks)
  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notebook_id INTEGER NOT NULL,
    transcription TEXT,
    summary TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error al crear la tabla classes:', err.message);
    } else {
      console.log('Tabla classes creada o ya existente');
    }
  });
}

module.exports = db;
