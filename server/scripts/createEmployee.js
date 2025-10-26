// server/scripts/createEmployee.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('../models/Employee');
require('dotenv').config();

async function createEmployee() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/banking_portal');
    console.log('✅ Connected to MongoDB');

    // Employee details
    const employeeData = {
      employeeId: 'EMP001',
      fullName: 'John Verification Officer',
      username: 'employee1',
      password: 'Employee123!', 
      role: 'employee',
      department: 'International Payments'
    };

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ username: employeeData.username });
    if (existingEmployee) {
      console.log('❌ Employee already exists:', employeeData.username);
      process.exit(0);
    }

    // Hash password
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(employeeData.password, salt);

    // Create employee
    const employee = new Employee({
      employeeId: employeeData.employeeId,
      fullName: employeeData.fullName,
      username: employeeData.username,
      passwordHash,
      passwordSalt: salt,
      role: employeeData.role,
      department: employeeData.department,
      isActive: true
    });

    await employee.save();

    console.log('✅ Employee created successfully!');
    console.log('   Login credentials:');
    console.log(`   Username: ${employeeData.username}`);
    console.log(`   Password: ${employeeData.password}`);
    console.log(`   Employee ID: ${employeeData.employeeId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    process.exit(1);
  }
}

createEmployee();