const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthService {
    async register(userData) {
        const { nombre, correo, telefono, contrasenia } = userData;
        
        const existingUser = await userRepository.findByEmail(correo);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const hashedContrasenia = await bcrypt.hash(contrasenia, 10);
        const user = await userRepository.create(nombre, correo, telefono, hashedContrasenia);
        
        return this.generateToken(user);
    }

    async login(correo, contrasenia) {
        const user = await userRepository.findByEmail(correo);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(contrasenia, user.contrasenia);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        return this.generateToken({ id: user.id, nombre: user.nombre, correo: user.correo });
    }

    generateToken(user) {
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, correo: user.correo },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        return { user, token };
    }
}

module.exports = new AuthService();
