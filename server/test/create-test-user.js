// Run this in your server to create a test employee
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function createTestEmployee() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Employee = require('./models/Employee'); // Adjust path as needed
  
  const hashedPassword = await bcrypt.hash('Password123!', 12);
  
  const employee = new Employee({
    email: 'employee@bank.com',
    password: hashedPassword,
    firstName: 'Test',
    lastName: 'Employee',
    employeeId: 'TEST001',
    role: 'admin'
  });
  
  await employee.save();
  console.log('✅ Test employee created:', employee.email);
  process.exit();
}

createTestEmployee();