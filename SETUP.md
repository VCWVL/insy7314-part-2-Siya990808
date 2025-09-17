# Secure Banking Portal - Setup Guide

## Quick Start (No Docker Required!)

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Internet connection** (for MongoDB Atlas)

### Step-by-Step Setup

#### 1. Clone the Repository

git clone https://github.com/VCWVL/insy7314-part-2-Siya990808.git
cd insy7314-part-2-Siya990808


#### 2. Setup Backend (Server)

cd server
npm install
npm run test-db    # Test MongoDB Atlas connection


If the database test passes ✅, continue to step 3. If it fails ❌, check your internet connection.

#### 3. Setup Frontend (Client)

cd ../client
npm install


#### 4. Start the Application

**Start both servers separately (Recommended for development)**

# Terminal 1: Start backend
cd server
npm run dev    # Uses nodemon for auto-restart

# Terminal 2: Start frontend  
cd client
npm start




## Scripts (Comand Prompt)

### Backend Scripts

npm start          # Start server
npm run dev        # Start with auto-reload
npm run test-db    # Test database connection
npm run atlas      # Test MongoDB Atlas connection
npm run security:full-scan  # Run security audit

### Frontend Scripts
npm start          # Start React development server
npm run build      # Build for production
npm test           # Run tests


## Security Features Implemented

✅ **Password Security**: bcrypt hashing with salt  
✅ **Input Validation**: RegEx patterns for all inputs  
✅ **SSL/TLS**: HTTPS encryption (certificates included)  
✅ **Attack Protection**: XSS, CSRF, SQL Injection, DDoS  
✅ **Rate Limiting**: Prevents brute force attacks  
✅ **Security Headers**: Helmet.js implementation  
✅ **Session Security**: Secure cookie configuration  
✅ **Database Security**: MongoDB Atlas with authentication  

## Testing the Application

1. **Start both servers** (frontend + backend)
2. **Open browser** to http://localhost:3000
3. **Test user registration** with secure password
4. **Test login** functionality
5. **Test payment forms** with validation
6. **Check HTTPS** at https://localhost:5001
