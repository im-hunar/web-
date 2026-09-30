const bcrypt = require('bcryptjs');
const store = require('../db/store');

const ROLES = {
  PATIENT: 'PATIENT',
  DOCTOR: 'DOCTOR',
  CAREGIVER: 'CAREGIVER',
  ADMIN: 'ADMIN'
};

class UserModel {
  static ROLES = ROLES;

  static async hashPassword(plainPassword) {
    const saltRounds = 12;
    return await bcrypt.hash(plainPassword, saltRounds);
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async create({ email, password, name, role = ROLES.PATIENT, id }) {
    // Never store plaintext password!
    const hashedPassword = await this.hashPassword(password);
    
    // Ensure role is valid
    if (!Object.values(ROLES).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const newUser = await store.createUser({
      id,
      email,
      password: hashedPassword,
      name,
      role
    });

    // Exclude password from returned model
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  static async findByEmail(email) {
    return await store.findUserByEmail(email);
  }

  static async findById(id) {
    const user = await store.findUserById(id);
    if (!user) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = { UserModel, ROLES };
