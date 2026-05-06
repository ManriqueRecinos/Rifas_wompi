const db = require('../config/db');

class UserRepository {
    async findByEmail(email) {
        const result = await db.query('SELECT * FROM usuario WHERE correo = $1', [email]);
        return result.rows[0];
    }

    async create(nombre, correo, telefono, hashedContrasenia) {
        const result = await db.query(
            'INSERT INTO usuario (nombre, correo, telefono, contrasenia) VALUES ($1, $2, $3, $4) RETURNING id, nombre, correo',
            [nombre, correo, telefono, hashedContrasenia]
        );
        return result.rows[0];
    }

    async findById(id) {
        const result = await db.query('SELECT id, nombre, correo, telefono FROM usuario WHERE id = $1', [id]);
        return result.rows[0];
    }
}

module.exports = new UserRepository();
