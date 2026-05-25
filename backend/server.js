require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();
const PORT = 3000;
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');



// Middleware para leer JSON
app.use(express.json());
app.use(cors());


// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor backend funcionando correctamente');
});

app.get('/sucursales', (req, res) => {
    db.query(
        'SELECT * FROM sucursales WHERE activa = TRUE',
        (err, results) => {
            if (err) {
                console.error('Error al obtener sucursales:', err);
                return res.status(500).json({ message: 'Error al obtener sucursales' });
            }
            res.json(results);
        }
    );
});

app.post('/sucursales', (req, res) => {
    const { nombre } = req.body;
    db.query(
        'INSERT INTO sucursales (nombre) VALUES (?)',
        [nombre],
        (err) => {
            if (err) {
                console.error('Error al crear sucursal:', err);
                return res.status(500).json({ message: 'Error al crear sucursal' });
            }
            res.json({ message: 'Sucursal creada correctamente' });
        }
    );
});

app.delete('/sucursales/:id', (req, res) => {
    const { id } = req.params;

    if (id == 1) {
        return res.status(400).json({ message: 'La sucursal principal no se puede eliminar' });
    }

    db.query(
        'UPDATE sucursales SET activa = FALSE WHERE id = ?',
        [id],
        (err) => {
            if (err) {
                console.error('Error al eliminar sucursal:', err);
                return res.status(500).json({ message: 'Error al eliminar sucursal' });
            }
            res.json({ message: 'Sucursal eliminada' });
        }
    );
});

// ===============================
// OBTENER TIPOS DE INGRESOS
// ===============================
app.get('/tipos', (req, res) => {
    const sql = 'SELECT id, nombre, categoria FROM tipos ORDER BY nombre';

    db.query(sql, (err, results) => {
        
        if (err) {
            console.error('Error en resumen:', err);
            return res.status(500).json({ message: 'Error al obtener resumen' });
        }

        res.json(results);
    });
});

// GUARDAR META
app.post('/meta', verificarToken, (req, res) => {

    const { valor } = req.body;

    if (!valor || Number(valor) <= 0) {
        return res.status(400).json({ message: 'Meta inválida' });
    }

    const usuarioId = req.usuario.id;

    const sql = `
        INSERT INTO metas (valor, usuario_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE valor = VALUES(valor)
    `;

    db.query(sql, [valor, usuarioId], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al guardar meta' });
        }

        res.json({ message: 'Meta guardada correctamente' });
    });

});


// OBTENER META ACTIVA
app.get('/meta', verificarToken, (req, res) => {
    const usuarioId = req.usuario.id;

    const sql = `
        SELECT * 
        FROM metas 
        WHERE usuario_id = ?
        ORDER BY id DESC 
        LIMIT 1
    `;

    db.query(sql, [usuarioId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al obtener meta' });
        }
        res.json(result[0] || null);
    });


});

// ELIMINAR META
app.delete('/meta', verificarToken, (req, res) => {
    const usuarioId = req.usuario.id;

    db.query(
        `DELETE FROM metas WHERE usuario_id = ?`,
        [usuarioId],
        () => {
            res.json({ message: 'Meta eliminada' });
        }
    );
});


//movimientos
app.post('/movimientos', verificarToken,(req, res) => {

    const { fecha, monto, descripcion, tipo_id, categoria } = req.body;

    // CAMPOS OBLIGATORIOS
    if (!fecha || !monto || !tipo_id || !categoria) {
        return res.status(400).json({
            message: 'Faltan datos obligatorios (fecha, monto, tipo, categoria)'
        });
    }

    // VALIDAR MONTO
    if (isNaN(monto) || Number(monto) <= 0) {
        return res.status(400).json({
            message: 'El monto debe ser un número mayor a 0'
        });
    }

    // VALIDAR CATEGORÍA
    if (!['ingreso', 'gasto'].includes(categoria)) {
        return res.status(400).json({
            message: 'Categoría inválida'
        });
    }

    // VALIDAR TIPO vs CATEGORIA
    const sqlTipo = `SELECT categoria FROM tipos WHERE id = ?`;

    db.query(sqlTipo, [tipo_id], (err, result) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error en consulta de tipo' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'Tipo no encontrado' });
        }

        const categoriaReal = result[0].categoria;

        if (categoriaReal !== categoria) {
            return res.status(400).json({
                message: 'El tipo no coincide con la categoría'
            });
        }

        // INSERTAR

        const usuarioId = req.usuario.id;

        const sqlInsert = `
        INSERT INTO movimientos (fecha, monto, descripcion, tipo_id, categoria, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?)
        `;


        db.query(sqlInsert,[fecha, monto, descripcion, tipo_id, categoria, usuarioId], (err2) => {

            if (err2) {
                console.error(err2);
                return res.status(500).json({ message: 'Error al guardar movimiento' });
            }

            res.json({ message: 'Movimiento guardado correctamente' });
        });

    });

});

//filtro de movimientos
app.get('/movimientos', verificarToken, (req, res) => {

    let {
        page = 1,
        categoria,
        tipo,
        monto,
        descripcion,
        sinDescripcion,
        fecha,
        mes,
        anio
    } = req.query;

    const limit = 10;
    const offset = (page - 1) * limit;

    let sql = `
        SELECT 
            m.id,
            m.fecha,
            m.monto,
            m.descripcion,
            m.categoria,
            t.id AS tipo_id,
            t.nombre AS tipo
        FROM movimientos m
        JOIN tipos t ON m.tipo_id = t.id
        WHERE m.usuario_id = ? AND m.eliminado = FALSE
    `;

    const usuarioId = req.usuario.id;

    let params = [usuarioId];

    // CATEGORÍA
    if (categoria) {
        sql += ` AND m.categoria = ?`;
        params.push(categoria);
    }

    // TIPO
    if (tipo) {
        sql += ` AND m.tipo_id = ?`;
        params.push(tipo);
    }

    // MONTO
    if (monto) {
        sql += ` AND m.monto = ?`;
        params.push(monto);
    }

    // DESCRIPCIÓN
    if (sinDescripcion === 'true') {
        sql += ` AND (m.descripcion IS NULL OR m.descripcion = '')`;
    } else if (descripcion) {
        sql += ` AND m.descripcion LIKE ?`;
        params.push(`%${descripcion}%`);
    }

    // FECHA DÍA
    if (fecha) {
        sql += ` AND m.fecha = ?`;
        params.push(fecha);
    }

    // MES
    if (mes) {
        sql += ` AND DATE_FORMAT(m.fecha, '%Y-%m') = ?`;
        params.push(mes);
    }

    // AÑO
    if (anio) {
        sql += ` AND YEAR(m.fecha) = ?`;
        params.push(anio);
    }

    // RANGO DE FECHAS    
    if (req.query.fechaInicio && req.query.fechaFin) {
        sql += ` AND DATE(m.fecha) BETWEEN ? AND ?`;
        params.push(req.query.fechaInicio, req.query.fechaFin);
    }


    // TOTAL
    const sqlTotal = `SELECT COUNT(*) AS total FROM (${sql}) AS sub`;

    db.query(sqlTotal, params, (err, totalRes) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error en conteo' });
        }

        const total = totalRes?.[0]?.total || 0;

        // PAGINACIÓN
        sql += ` ORDER BY m.fecha DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        db.query(sql, params, (err2, results) => {

            if (err2) {
                console.error(err2);
                return res.status(500).json({ error: 'Error en consulta' });
            }

            res.json({
                datos: results,
                total,
                pagina: Number(page),
                totalPaginas: Math.ceil(total / limit)
            });
        });
    });
});


//dashboard movimientos
app.get('/movimientos/resumen', verificarToken, (req, res) => {

    const sql = `
        SELECT
            COALESCE(SUM(CASE WHEN categoria='ingreso' AND DATE(fecha)=CURDATE() THEN monto END),0) AS ingresos_hoy,
            COALESCE(SUM(CASE WHEN categoria='gasto' AND DATE(fecha)=CURDATE() THEN monto END),0) AS gastos_hoy,

            COALESCE(SUM(CASE WHEN categoria='ingreso' AND MONTH(fecha)=MONTH(CURDATE()) THEN monto END),0) AS ingresos_mes,
            COALESCE(SUM(CASE WHEN categoria='gasto' AND MONTH(fecha)=MONTH(CURDATE()) THEN monto END),0) AS gastos_mes,

            COALESCE(SUM(CASE WHEN categoria='ingreso' 
                AND MONTH(fecha)=MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                THEN monto END),0) AS ingresos_mes_anterior,

            COALESCE(SUM(CASE WHEN categoria='gasto' 
                AND MONTH(fecha)=MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                THEN monto END),0) AS gastos_mes_anterior

        
        FROM movimientos m WHERE m.usuario_id = ? AND m.eliminado = FALSE


    `;

    db.query(sql, [req.usuario.id], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error en resumen' });
        }

        const data = results[0];

        const balance = data.ingresos_mes - data.gastos_mes;
        let variacion = 0;

        if (data.ingresos_mes_anterior > 0) {
            variacion = (
                (data.ingresos_mes - data.ingresos_mes_anterior) /
                data.ingresos_mes_anterior
            ) * 100;
        }

        res.json({
            ...data,
            balance,
            variacion: variacion.toFixed(2)
        });

    });
});


//graficas dobles
app.get('/movimientos/por-dia', verificarToken, (req, res) => {

    const sql = `
        SELECT
            fecha,
            COALESCE(SUM(CASE WHEN categoria='ingreso' THEN monto END),0) AS ingresos,
            COALESCE(SUM(CASE WHEN categoria='gasto' THEN monto END),0) AS gastos
        FROM movimientos m WHERE m.usuario_id = ? AND m.eliminado = FALSE
        GROUP BY fecha
        ORDER BY fecha;

    `;

    db.query(sql, [req.usuario.id], (err, datos) => {
        if (err) {
            console.error('Error en consulta de movimientos por día:', err);
            return res.status(500).json({ error: 'Error en consulta' });
        }
        res.json(datos);
    });
});

//delete
app.delete('/movimientos/:id', verificarToken, (req, res) => {
    const { id } = req.params;

    const query = 'UPDATE movimientos SET eliminado = TRUE WHERE id = ? AND usuario_id = ?';

    db.query(query, [id, req.usuario.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al eliminar' });
        }

        res.json({ message: 'Movimiento eliminado correctamente' });
    });
});

//put movimientos
app.put('/movimientos/:id', verificarToken, (req, res) => {

    const { id } = req.params;
    const { fecha, monto, descripcion, tipo_id, categoria } = req.body;

    if (!fecha || !monto || !tipo_id || !categoria) {
        return res.status(400).json({ message: 'Datos incompletos' });
    }

    const sql = `
        UPDATE movimientos
        SET fecha = ?, monto = ?, descripcion = ?, tipo_id = ?, categoria = ?
        WHERE id = ? AND usuario_id = ?
    `;

    db.query(sql, [fecha, monto, descripcion, tipo_id, categoria, id, req.usuario.id], (err) => {

        if (err) {
            console.error('Error al editar movimiento:', err);
            return res.status(500).json({ message: 'Error al editar movimiento' });
        }

        res.json({ message: 'Movimiento actualizado correctamente' });
    });
});

app.get('/movimientos/indicadores', verificarToken, (req, res) => {

    const sql = `
        SELECT
            (
                SELECT 
                    ROUND(SUM(m.monto) / COUNT(DISTINCT m.fecha), 2)
                FROM movimientos m
                WHERE m.categoria = 'ingreso' AND m.eliminado = FALSE AND m.usuario_id = ?
                AND MONTH(m.fecha) = MONTH(CURDATE())
                AND YEAR(m.fecha) = YEAR(CURDATE())
            ) AS promedio_diario,

            (
                SELECT m.fecha
                FROM movimientos m
                WHERE m.categoria = 'ingreso' AND m.eliminado = FALSE AND m.usuario_id = ?
                AND MONTH(m.fecha) = MONTH(CURDATE())
                AND YEAR(m.fecha) = YEAR(CURDATE())
                GROUP BY m.fecha
                ORDER BY SUM(m.monto) DESC
                LIMIT 1
            ) AS mejor_dia_fecha,

            (
                SELECT SUM(m.monto)
                FROM movimientos m
                WHERE m.categoria = 'ingreso' AND m.eliminado = FALSE AND m.usuario_id = ?

                AND m.fecha = (
                    SELECT m2.fecha
                    FROM movimientos m2
                    WHERE m2.categoria = 'ingreso' AND m2.eliminado = FALSE AND m2.usuario_id = ?
                    AND MONTH(m2.fecha) = MONTH(CURDATE())
                    GROUP BY m2.fecha
                    ORDER BY SUM(m2.monto) DESC
                    LIMIT 1
                )
            ) AS mejor_dia_total,

            (
                SELECT fecha
                FROM movimientos m
                WHERE m.categoria = 'ingreso' AND m.eliminado = FALSE AND m.usuario_id = ?
                AND MONTH(m.fecha) = MONTH(CURDATE())
                GROUP BY m.fecha
                ORDER BY SUM(m.monto) ASC
                LIMIT 1
            ) AS peor_dia_fecha,

            (
                SELECT SUM(m.monto)
                FROM movimientos m
                WHERE m.categoria = 'ingreso' AND m.eliminado = FALSE AND m.usuario_id = ?
                AND m.fecha = (
                    SELECT m.fecha
                    FROM movimientos m
                    WHERE m.categoria = 'ingreso' AND m.eliminado = FALSE AND m.usuario_id = ?
                    AND MONTH(m.fecha) = MONTH(CURDATE())
                    GROUP BY m.fecha
                    ORDER BY SUM(m.monto) ASC
                    LIMIT 1
                )
            ) AS peor_dia_total
    `;

db.query(sql, [
    req.usuario.id,
    req.usuario.id,
    req.usuario.id,
    req.usuario.id,
    req.usuario.id,
    req.usuario.id,
    req.usuario.id
], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al obtener indicadores' });
        }

        res.json(results[0]);
    });
});

app.get('/movimientos/indicadores-gastos', verificarToken, (req, res) => {

    const sql = `
        SELECT
            (
                SELECT 
                    ROUND(SUM(monto) / COUNT(DISTINCT DATE(fecha)), 0)
                FROM movimientos m
                WHERE m.categoria = 'gasto'
                AND m.eliminado = FALSE
                AND m.usuario_id = ?
                AND MONTH(m.fecha) = MONTH(CURDATE())
                AND YEAR(m.fecha) = YEAR(CURDATE())
            ) AS promedio_gasto,

            (
                SELECT DATE(m.fecha)
                FROM movimientos m
                WHERE m.categoria = 'gasto'
                AND m.eliminado = FALSE
                AND m.usuario_id = ?
                AND MONTH(m.fecha) = MONTH(CURDATE())
                AND YEAR(m.fecha) = YEAR(CURDATE())
                GROUP BY DATE(m.fecha)
                ORDER BY SUM(m.monto) DESC
                LIMIT 1
            ) AS peor_dia_fecha,

            (
                SELECT SUM(m.monto)
                FROM movimientos m
                WHERE m.categoria = 'gasto'
                AND m.eliminado = FALSE
                AND m.usuario_id = ?
                AND DATE(m.fecha) = (
                    SELECT DATE(m2.fecha)
                    FROM movimientos m2
                    WHERE m2.categoria = 'gasto'
                    AND m2.eliminado = FALSE
                    AND m2.usuario_id = ?
                    AND MONTH(m2.fecha) = MONTH(CURDATE())
                    AND YEAR(m2.fecha) = YEAR(CURDATE())
                    
                    GROUP BY DATE(m2.fecha)
                    ORDER BY SUM(m2.monto) DESC
                    LIMIT 1
                )
            ) AS peor_dia_total
    `;

    db.query(sql, [req.usuario.id, req.usuario.id, req.usuario.id, req.usuario.id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error indicadores gastos' });
        }

        res.json(results[0]);
    });
});


app.get('/movimientos/promedio-historico', verificarToken, (req, res) => {

    const sql = `
        SELECT 
            ROUND(AVG(total), 2) AS promedio_historico
        FROM (
            SELECT 
                DATE_FORMAT(m.fecha, '%Y-%m') AS mes,
                SUM(m.monto) AS total
            FROM movimientos m
            WHERE m.categoria = 'ingreso' AND m.eliminado = FALSE AND m.usuario_id = ?
            GROUP BY mes
        ) AS totales_mensuales
    `;

    db.query(sql, [req.usuario.id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error promedio histórico' });
        }

        res.json(results[0]);
    });
});

app.get('/movimientos/por-tipo', verificarToken, (req, res) => {
    const { categoria } = req.query;

    const sql = `
        SELECT t.nombre AS tipo, SUM(m.monto) AS total
        FROM movimientos m
        JOIN tipos t ON m.tipo_id = t.id
        WHERE m.usuario_id = ? AND m.categoria = ? AND m.eliminado = FALSE 
        GROUP BY t.nombre

    `;

    db.query(sql, [req.usuario.id, categoria], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});


// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

app.get('/movimientos/suma', verificarToken, (req, res) => {
    const { categoria, tipo, monto, descripcion,sinDescripcion, fecha, mes, anio } = req.query;

    let sql = `SELECT SUM(m.monto) AS total FROM movimientos m WHERE m.usuario_id = ? AND m.categoria = ? AND m.eliminado = FALSE`;
    let params = [req.usuario.id, categoria];

    if (tipo) {
        sql += " AND m.tipo_id = ?";
        params.push(tipo);
    }

    if (monto) {
        sql += " AND m.monto = ?";
        params.push(monto);
    }

    // DESCRIPCIÓN
    if (sinDescripcion === 'true') {
        sql += " AND (m.descripcion IS NULL OR m.descripcion = '')";
    }
    else if (descripcion) {
        sql += " AND m.descripcion LIKE ?";
        params.push(`%${descripcion}%`);
    }


    if (fecha) {
        sql += " AND DATE(m.fecha) = ?";
        params.push(fecha);
    }

    if (mes) {
        sql += " AND DATE_FORMAT(m.fecha, '%Y-%m') = ?";
        params.push(mes);
    }

    if (anio) {
        sql += " AND YEAR(m.fecha) = ?";
        params.push(anio);
    }

    if (req.query.fechaInicio && req.query.fechaFin) {
        sql += " AND DATE(m.fecha) BETWEEN ? AND ?";
        params.push(req.query.fechaInicio, req.query.fechaFin);
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ total: result[0].total || 0 });
    });
});

// Endpoint para obtener movimientos eliminados
app.get('/movimientos/eliminados', verificarToken, (req, res) => {

    const {
        page = 1,
        categoria,
        tipo,
        monto,
        descripcion,
        fecha,
        mes,
        anio,
        fechaInicio,
        fechaFin
    } = req.query;

    const limit = 10;
    const offset = (page - 1) * limit;

    let sql = `
        SELECT m.*, t.nombre AS tipo
        FROM movimientos m
        JOIN tipos t ON m.tipo_id = t.id
        WHERE m.usuario_id = ? AND m.eliminado = TRUE
    `;

    let params = [req.usuario.id];

    if (categoria) {
        sql += ` AND m.categoria = ?`;
        params.push(categoria);
    }

    if (tipo) {
        sql += ` AND m.tipo_id = ?`;
        params.push(tipo);
    }

    if (monto) {
        sql += ` AND m.monto = ?`;
        params.push(monto);
    }

    if (descripcion) {
        sql += ` AND m.descripcion LIKE ?`;
        params.push(`%${descripcion}%`);
    }

    if (fecha) {
        sql += ` AND DATE(m.fecha) = ?`;
        params.push(fecha);
    }

    if (mes) {
        sql += ` AND DATE_FORMAT(m.fecha, '%Y-%m') = ?`;
        params.push(mes);
    }

    if (anio) {
        sql += ` AND YEAR(m.fecha) = ?`;
        params.push(anio);
    }

    if (fechaInicio && fechaFin) {
        sql += ` AND DATE(m.fecha) BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
    }

    const sqlTotal = `SELECT COUNT(*) AS total FROM (${sql}) AS sub`;

    db.query(sqlTotal, params, (err, totalRes) => {

        const total = totalRes[0].total;

        sql += ` ORDER BY m.fecha DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        db.query(sql, params, (err2, results) => {

            res.json({
                datos: results,
                total,
                pagina: Number(page),
                totalPaginas: Math.ceil(total / limit)
            });

        });

    });
});

// Endpoint para restaurar un movimiento eliminado
app.put('/movimientos/restaurar/:id', verificarToken, (req, res) => {
    const { id } = req.params;

    db.query(
        'UPDATE movimientos SET eliminado = FALSE WHERE id = ? AND usuario_id = ?',
        [id, req.usuario.id],
        (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error al restaurar' });
            }

            res.json({ message: 'Movimiento restaurado correctamente' });
        }
    );
});


const bcrypt = require('bcrypt');

function validarPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
}


app.post('/auth/register', async (req, res) => {
    limpiarPendientesExpirados();
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Faltan credenciales"
        });
    }

    if (!validarPassword(password)) {
    return res.status(400).json({
        message: "La contraseña debe tener mínimo 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos"
    });
}

    try {
        const hash = await bcrypt.hash(password, 10);

        // ✅ 1. ¿YA EXISTE EN USUARIOS? → BLOQUEAR
        db.query(
            "SELECT id FROM usuarios WHERE email = ?",
            [email],
            (errUser, users) => {

                if (errUser) {
                    console.error(errUser);
                    return res.status(500).json({ message: "Error servidor" });
                }

                if (users.length > 0) {
                    return res.status(400).json({
                        message: "Este usuario ya existe"
                    });
                }

                // ✅ 2. ¿ESTÁ EN PENDIENTES? → REENVIAR
                db.query(
                    "SELECT * FROM usuarios_pendientes WHERE email = ?",
                    [email],
                    async (errPend, pendientes) => {

                        if (errPend) {
                            console.error(errPend);
                            return res.status(500).json({ message: "Error servidor" });
                        }


                    if (pendientes.length > 0) {

                        const ultimoEnvio = new Date(pendientes[0].creado_en);
                        const ahora = new Date();
                        const diferencia = (ahora - ultimoEnvio) / 1000;

                        if (diferencia < 60) {
                            return res.status(429).json({
                                message: "Espera un momento antes de reenviar el correo"
                            });
                        }

                        // ✅ REENVIAR REAL
                        const nuevoToken = crypto.randomBytes(32).toString('hex');

                        return db.query(
                            "UPDATE usuarios_pendientes SET token=?, creado_en=NOW() WHERE email=?",
                            [nuevoToken, email],
                            async () => {

                                await enviarCorreoConfirmacion(email, nuevoToken);

                                return res.json({
                                    message: "Revisa tu correo para confirmar tu cuenta (mensaje reenviado)"
                                });
                            }
                        );

                        return; // 🔥 CRÍTICO
                    }


                        // ✅ 3. CREAR NUEVO
                        const token = crypto.randomBytes(32).toString('hex');

                        db.query(
                            "INSERT INTO usuarios_pendientes (email, password, token, creado_en) VALUES (?, ?, ?, NOW())",
                            [email, hash, token],
                            async (errInsert) => {

                                if (errInsert) {
                                    console.error(errInsert);
                                    return res.status(500).json({
                                        message: "Error al registrar"
                                    });
                                }

                                await enviarCorreoConfirmacion(email, token);

                                res.json({
                                    message: "Revisa tu correo para confirmar tu cuenta"
                                });
                            }
                        );

                    }
                );
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error servidor" });
    }
});

app.get('/auth/confirmar/:token', (req, res) => {
    const { token } = req.params;

    const sql = `
        SELECT * FROM usuarios_pendientes 
        WHERE token = ? 
        AND creado_en >= NOW() - INTERVAL 1 DAY
    `;

    db.query(sql, [token], (err, result) => {


        if (err) {
            console.error(err);
            return res.status(500).send("Error en confirmación");
        }

        if (result.length === 0) {
            return res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
        <meta charset="UTF-8">
        <title>Confirmación vencida</title>

        <style>
            body {
                margin: 0;
                font-family: 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #ef4444, #991b1b);
            }

            .card {
                background: white;
                padding: 40px;
                border-radius: 16px;
                text-align: center;
                width: 360px;
                box-shadow: 0 15px 40px rgba(0,0,0,0.2);
            }

            .icon {
                font-size: 60px;
                color: #dc2626;
                margin-bottom: 10px;
            }

            h2 {
                margin-bottom: 10px;
                color: #dc2626;
            }

            p {
                color: #6b7280;
                margin-bottom: 20px;
            }

            .acciones {
                display: flex;
                gap: 10px;
                justify-content: center;
            }

            button {
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: 0.2s;
            }

            .btn-login {
                background: #3b82f6;
                color: white;
            }

            .btn-login:hover {
                background: #2563eb;
                transform: scale(1.05);
            }

            .btn-reintentar {
                background: #10b981;
                color: white;
            }

            .btn-reintentar:hover {
                background: #059669;
                transform: scale(1.05);
            }
        </style>

        </head>
        <body>

        <div class="card">
            <div class="icon">❌</div>
            <h2>Confirmación vencida</h2>
            <p>El enlace ya no es válido. Debes registrarte nuevamente para generar uno nuevo.</p>

            <div class="acciones">
                <button class="btn-login" onclick="irLogin()">Ir al login</button>
                <button class="btn-reintentar" onclick="irRegistro()">Registrarme otra vez</button>
            </div>
        </div>

        <script>
        function irLogin() {
            window.location.href = "http://localhost:5500/index.html";
        }

        function irRegistro() {
            window.location.href = "http://localhost:5500/index.html";
        }
        </script>

        </body>
        </html>
        `);
        }


        const user = result[0];

        // mover a usuarios
        db.query(
            `INSERT INTO usuarios (email, password) VALUES (?, ?)`,
            [user.email, user.password],
            (err2) => {

                if (err2) {
                    return res.status(500).send("Error al crear usuario");
                }

                // ✅ borrar pendiente
                db.query(
                    `DELETE FROM usuarios_pendientes WHERE id = ?`,
                    [user.id]
                );

                res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                <meta charset="UTF-8">
                <title>Cuenta confirmada</title>

                <style>
                    body {
                        margin: 0;
                        font-family: 'Segoe UI', sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        background: linear-gradient(135deg, #3b82f6, #6366f1);
                    }

                    .card {
                        background: white;
                        padding: 40px;
                        border-radius: 16px;
                        text-align: center;
                        width: 350px;
                        box-shadow: 0 15px 40px rgba(0,0,0,0.2);
                    }

                    .icon {
                        font-size: 60px;
                        color: #10b981;
                        margin-bottom: 10px;
                    }

                    h2 {
                        margin-bottom: 10px;
                    }

                    p {
                        color: #6b7280;
                        margin-bottom: 25px;
                    }

                    button {
                        padding: 10px 20px;
                        background: #3b82f6;
                        border: none;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: 0.2s;
                    }

                    button:hover {
                        background: #2563eb;
                        transform: scale(1.05);
                    }
                </style>

                </head>
                <body>

                <div class="card">
                    <div class="icon">✅</div>
                    <h2>Cuenta confirmada</h2>
                    <p>Tu cuenta ya está activa, puedes iniciar sesión.</p>

                    <button onclick="irAlLogin()">Ir al login</button>
                </div>

                <script>
                function irAlLogin() {
                    window.location.href = "http://localhost:5500/index.html";
                }

                /* ✅ opcional: redirección automática en 3 segundos */
                setTimeout(() => {
                    window.location.href = "http://localhost:5500/index.html";
                }, 3000);
                </script>

                </body>
                </html>
                `);
            }
        );
    });
});

const jwt = require('jsonwebtoken');

app.post('/auth/login', (req, res) => {

    const { email, password } = req.body;

        if (!email || !password) {
        return res.status(400).json({ message: 'Faltan credenciales' });
    }
    

    const sql = `SELECT * FROM usuarios WHERE email = ?`;

    db.query(sql, [email], async (err, results) => {

        if (err || results.length === 0) {

            // 🔥 buscar en pendientes
        db.query(
            "SELECT id FROM usuarios_pendientes WHERE email = ?",
            [email],
            (errPend, pendientes) => {

                if (errPend) {
                    console.error(errPend);
                    return res.status(500).json({
                        message: "Error servidor"
                    });
                }

                if (pendientes.length > 0) {
                    return res.status(400).json({
                        message: "Tu cuenta no ha sido confirmada, revisa tu correo"
                    });
                }

                return res.status(400).json({
                    message: "Usuario no encontrado"
                });
            }
        );
            return;
        }

        const usuario = results[0];

        const match = await bcrypt.compare(password, usuario.password);

        if (!match) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )


        res.json({ token });
    });
});

function verificarToken(req, res, next) {
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No autorizado (sin token)' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id) {
            return res.status(401).json({ message: 'Token inválido (sin id)' });
        }

        req.usuario = decoded;

        next();

    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
}

async function enviarCorreoConfirmacion(email, token) {

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const link = `http://localhost:3000/auth/confirmar/${token}`;

    await transporter.sendMail({
        from: '"MicroGEST" <no-reply@microgest.com>',
        to: email,
        subject: 'Confirma tu cuenta',
        html: `
            <h2>Bienvenido a MicroGEST</h2>
            <p>Para activar tu cuenta, haz click en el siguiente botón:</p>
            <a href="${link}" style="padding:10px 20px;background:#3b82f6;color:white;border-radius:8px;text-decoration:none;">
                Confirmar cuenta
            </a>
        `
    });
}

async function enviarReporteCorreo(email, bufferPDF) {

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: '"MicroGEST" <no-reply@microgest.com>',
        to: email,
        subject: 'Tu extracto MicroGEST',
        html: `
            <h2>Tu extracto está listo 📊</h2>
            <p>Adjunto encontrarás tu reporte financiero generado desde MicroGEST.</p>
            <p>Gracias por usar nuestra plataforma.</p>
        `,
        attachments: [
            {
                filename: 'reporte.pdf',
                content: bufferPDF
            }
        ]
    });
}

function limpiarPendientesExpirados() {
    db.query(
        "DELETE FROM usuarios_pendientes WHERE creado_en < NOW() - INTERVAL 1 DAY",
        (err) => {
            if (err) {
                console.error("Error limpiando pendientes:", err);
            }
        }
    );
}

app.get('/reporte', verificarToken, (req, res) => {

    const colorTexto = '#000000';

    const {
        categoria,
        tipo,
        descripcion,
        sinDescripcion,
        fechaInicio,
        fechaFin
    } = req.query;

    const usuarioId = req.usuario.id;

    let sql = `
        SELECT m.fecha, m.monto, m.descripcion, t.nombre AS tipo, m.categoria
        FROM movimientos m
        JOIN tipos t ON m.tipo_id = t.id
        WHERE m.usuario_id = ? AND m.eliminado = FALSE
    `;

    let params = [usuarioId];

    if (categoria) {
        sql += ` AND m.categoria = ?`;
        params.push(categoria);
    }

    if (tipo) {
        sql += ` AND m.tipo_id = ?`;
        params.push(tipo);
    }

    if (sinDescripcion === 'true') {
        sql += ` AND (m.descripcion IS NULL OR m.descripcion = '')`;
    } else if (descripcion) {
        sql += ` AND m.descripcion LIKE ?`;
        params.push(`%${descripcion}%`);
    }

    if (fechaInicio && fechaFin) {
        sql += ` AND DATE(m.fecha) BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
    }

    db.query(sql, params, (err, resultados) => {

    if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error en consulta' });
    }

    // ✅ SOLO UNA consulta de usuario
    const sqlUsuario = 'SELECT email FROM usuarios WHERE id = ?';

    db.query(sqlUsuario, [usuarioId], (errUser, userResult) => {

        if (errUser) {
            console.error(errUser);
            return res.status(500).json({ message: 'Error obteniendo usuario' });
        }

        const nombreUsuario = userResult[0]?.email?.split('@')[0] || 'Usuario';

        // ===============================
        // PDF
        // ===============================

        const doc = new PDFDocument();
        // ===== POSICIONES BASE =====
        const xFecha = 50;
        const xMovimiento = 120;
        const xTipo = 220;
        const xDescripcion = 320;
        const xMonto = 480;
        const xFinal = 560;

        const formato = new Intl.NumberFormat('es-CO');

        const totalGeneral = resultados.reduce(
            (sum, i) => sum + Number(i.monto),
            0
        );

        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));

        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);

            const emailUsuario = userResult?.[0]?.email;

            if (!emailUsuario) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            try {
                await enviarReporteCorreo(emailUsuario, pdfData);

                res.json({
                    success: true,
                    message: 'Reporte enviado al correo',
                    email: emailUsuario
                });

            } catch (error) {
                console.error(error);
                res.status(500).json({
                    success: false,
                    message: 'Error enviando el reporte'
                });
            }
        });


        doc.fontSize(18).fillColor('#111827').text('MicroGEST - Extracto', { align: 'center' });

        doc.moveDown();

        const yInfo = 110;

        doc.fontSize(12);

        doc.text(`Usuario: ${nombreUsuario}`, xFecha, yInfo);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, xFecha, yInfo + 15);

        doc.font('Helvetica-Bold');

        doc.text(
            'TOTAL:',
            xMonto,
            yInfo,
            {
                width: xFinal - xMonto,
                align: 'right'
            }
        );

        doc.text(
            `$${formato.format(totalGeneral)}`,
            xMonto,
            yInfo + 15,
            {
                width: xFinal - xMonto,
                align: 'right'
            }
        );

        doc.font('Helvetica-Bold');

        // ===== HEADER =====
        doc.font('Helvetica-Bold');

        doc.text('Fecha', xFecha, 150, { width: xMovimiento - xFecha, align: 'center' });
        doc.text('Movimiento', xMovimiento, 150, { width: xTipo - xMovimiento, align: 'center' });
        doc.text('Tipo', xTipo, 150, { width: xDescripcion - xTipo, align: 'center' });
        doc.text('Descripción', xDescripcion, 150, { width: xMonto - xDescripcion, align: 'center' });
        doc.text('Monto', xMonto, 150, { width: xFinal - xMonto, align: 'center' });



        const headerTop = 140;
        const headerBottom = 170;

        // horizontales
        doc.moveTo(xFecha, headerTop).lineTo(xFinal, headerTop).stroke();
        doc.moveTo(xFecha, headerBottom).lineTo(xFinal, headerBottom).stroke();

        // verticales
        doc.moveTo(xFecha, headerTop).lineTo(xFecha, headerBottom).stroke();
        doc.moveTo(xMovimiento, headerTop).lineTo(xMovimiento, headerBottom).stroke();
        doc.moveTo(xTipo, headerTop).lineTo(xTipo, headerBottom).stroke();
        doc.moveTo(xDescripcion, headerTop).lineTo(xDescripcion, headerBottom).stroke();
        doc.moveTo(xMonto, headerTop).lineTo(xMonto, headerBottom).stroke();
        doc.moveTo(xFinal, headerTop).lineTo(xFinal, headerBottom).stroke();


        doc.font('Helvetica');

        let y = 170;

        resultados.forEach(item => {

            const rowTop = y;
            const rowBottom = y + 20;

            const textY = y + 6; // ✅ centrado vertical

            // ===== TEXTO ======
            doc.text(
                new Date(item.fecha).toLocaleDateString('es-CO'),
                xFecha,
                textY,
                {
                    width: xMovimiento - xFecha,
                    align: 'center'
                }
            );

            const color = item.categoria === 'ingreso' ? 'green' : 'red';

            doc.fillColor(color).text(
                item.categoria === 'ingreso' ? 'Ingreso' : 'Gasto',
                xMovimiento,
                textY,
                {
                    width: xTipo - xMovimiento,
                    align: 'center'
                }
            );

            doc.fillColor(colorTexto);

            doc.text(item.tipo, xTipo, textY, {
                width: xDescripcion - xTipo,
                align: 'center'
            });

            doc.text(item.descripcion || '-', xDescripcion, textY, {
                width: xMonto - xDescripcion,
                align: 'center'
            });

            doc.text(`$${formato.format(item.monto)}`, xMonto, textY, {
                width: xFinal - xMonto,
                align: 'center'
            });

            // ===== LÍNEAS =====

            doc.moveTo(xFecha, rowBottom).lineTo(xFinal, rowBottom).stroke();

            doc.moveTo(xFecha, rowTop).lineTo(xFecha, rowBottom).stroke();
            doc.moveTo(xMovimiento, rowTop).lineTo(xMovimiento, rowBottom).stroke();
            doc.moveTo(xTipo, rowTop).lineTo(xTipo, rowBottom).stroke();
            doc.moveTo(xDescripcion, rowTop).lineTo(xDescripcion, rowBottom).stroke();
            doc.moveTo(xMonto, rowTop).lineTo(xMonto, rowBottom).stroke();
            doc.moveTo(xFinal, rowTop).lineTo(xFinal, rowBottom).stroke();

            y += 20;

            if (y > 700) {
                doc.addPage();
                y = 170;

                // 🔥 REDIBUJAR HEADER
                doc.font('Helvetica-Bold');

                doc.text('Fecha', xFecha, 150, { width: xMovimiento - xFecha, align: 'center' });
                doc.text('Movimiento', xMovimiento, 150, { width: xTipo - xMovimiento, align: 'center' });
                doc.text('Tipo', xTipo, 150, { width: xDescripcion - xTipo, align: 'center' });
                doc.text('Descripción', xDescripcion, 150, { width: xMonto - xDescripcion, align: 'center' });
                doc.text('Monto', xMonto, 150, { width: xFinal - xMonto, align: 'center' });
            }

        });

        doc.end();

        });
    });     
});    
