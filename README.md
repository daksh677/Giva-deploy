# GIVA Product Management System

A full-stack web application for managing products with user authentication and role-based permissions.

## Features

- User Authentication (Login/Signup)
- Role-based access control (Admin/Regular Users)
- Product Management (CRUD operations)
- Responsive Design with Tailwind CSS
- Protected Routes
- Permission-based editing/deleting of products

## Tech Stack

### Frontend
- React.js
- React Router DOM
- Tailwind CSS
- Axios
- Context API for state management

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcrypt for password hashing

## Prerequisites

Before running this project, make sure you have the following installed:
- Node.js (v14 or higher)
- PostgreSQL
- npm 

## Installation & Setup

1. Clone the repository
```bash
git clone <repository-url>
cd GIVA

2.Backend Setup
# Navigate to backend directory
cd product-management-backend
# Install dependencies
npm install

# Create a .env file in the backend directory with the following variables:
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=your_db_name
DB_PASSWORD=your_db_password
DB_PORT=5432
PORT=5000
# Start the backend server
npm start

3.Frontend Setup
# Navigate to frontend directory
cd product-management

# Install dependencies
npm install

# Start the frontend application
npm start

### Default Admin Credentials
Email: admin@example.com
Password: admin123


