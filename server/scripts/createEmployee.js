// server/scripts/createEmployee.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
require('dotenv').config();

async function createEmployees() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/banking_portal');
    console.log('✅ Connected to MongoDB');

    // Employees to create
    const employees = [
      {
        employeeId: 'EMP001',
        fullName: 'John Verification Officer',
        username: 'employee1',
        password: 'Employee123!',
        role: 'employee',
        department: 'International Payments'
      },
      {
        employeeId: 'EMP002',
        fullName: 'Jane Payments Officer',
        username: 'employee2',
        password: 'SecurePass456!',
        role: 'employee',
        department: 'International Payments'
      }
    ];

    for (const empData of employees) {
      const existingEmployee = await Employee.findOne({ username: empData.username });
      if (existingEmployee) {
        console.log('❌ Employee already exists:', empData.username);
        continue; // skip if already exists
      }

      const saltRounds = 12;
      const salt = await bcrypt.genSalt(saltRounds);
      const passwordHash = await bcrypt.hash(empData.password, salt);

      const employee = new Employee({
        employeeId: empData.employeeId,
        fullName: empData.fullName,
        username: empData.username,
        passwordHash,
        passwordSalt: salt,
        role: empData.role,
        department: empData.department,
        isActive: true
      });

      await employee.save();
      console.log('✅ Employee created:', empData.username);
    }

    console.log('✅ All employees processed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating employees:', error);
    process.exit(1);
  }
}

createEmployees();
