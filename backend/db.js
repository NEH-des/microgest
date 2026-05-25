const mysql = require('mysql2');

// Crear conexión
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mysql2026*',
    database: 'gestion_ingresos'
});

// Probar conexión
connection.connect((error) => {
    if (error) {
        console.error('❌ Error conectando a MySQL:', error);
    } else {
        console.log('✅ Conectado correctamente a MySQL');
    }
});

module.exports = connection;