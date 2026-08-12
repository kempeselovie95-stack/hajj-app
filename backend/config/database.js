const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'hajj_cameroun',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connecté — base :', process.env.DB_NAME || 'hajj_cameroun');
    connection.release();
  } catch (error) {
    console.warn('⚠️ MySQL indisponible, le backend démarre en mode démo :', error.message);
  }
};

module.exports = { pool, testConnection };
