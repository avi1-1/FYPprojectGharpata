# GharPata - Smart House Rental Management System 🏠

A comprehensive MERN stack application with SQL database for managing house rentals in Nepal.

## 🛠️ Tech Stack

- **Frontend**: React 18 + **Vite** (fast build tool)
- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt

## 📋 Features

- **User Management**: Tenant, Landlord, and Admin roles
- **Property Listings**: Create, view, and manage properties
- **Booking System**: Handle rental bookings and agreements
- **Payment Integration**: Track rent and deposit payments (Khalti, eSewa, Bank Transfer)
- **Complaint Management**: Submit and track maintenance/payment complaints
- **Admin Dashboard**: Approve users, properties, and manage the platform

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd FYPprojectGharpata
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up the database**
   
   - Create a MySQL database:
     ```sql
     CREATE DATABASE gharpata;
     ```
   
   - Import the schema:
     ```bash
     mysql -u root -p gharpata < database/schema.sql
     ```

4. **Configure environment variables**
   
   - The Backend `.env` file is already created with default values
   - Update `Backend/.env` with your database credentials:
     ```env
     PORT=5000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=gharpata
     JWT_SECRET=your_secret_key
     ```

### Running the Application

#### Option 1: Run both servers concurrently (Recommended)
```bash
npm run dev
```

#### Option 2: Run servers separately

**Backend Server** (Port 5000)
```bash
npm run dev:server
# or
cd Backend
npm start
```

**Frontend Server** (Port 3000)
```bash
npm run dev:client
# or
cd Frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 📁 Project Structure

```
FYPprojectGharpata/
├── Backend/
│   ├── config/
│   │   └── database.js          # Database connection configuration
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js               # Authentication routes
│   │   ├── properties.js         # Property management routes
│   │   ├── bookings.js           # Booking routes
│   │   ├── payments.js           # Payment routes
│   │   ├── complaints.js         # Complaint routes
│   │   ├── admin.js              # Admin routes
│   │   └── users.js              # User routes
│   ├── public/uploads/           # Uploaded files (images, etc.)
│   ├── .env                      # Environment variables
│   ├── .gitignore
│   ├── server.js                 # Express server entry point
│   └── package.json
├── Frontend/
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── pages/                # React page components
│   │   ├── App.jsx               # Main React component
│   │   ├── App.css
│   │   ├── index.jsx             # React entry point
│   │   └── index.css
│   ├── index.html                # HTML template
│   ├── vite.config.js            # Vite configuration
│   ├── .gitignore
│   └── package.json
├── database/
│   └── schema.sql                # MySQL database schema
├── .gitignore
├── package.json                  # Root package.json
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Properties
- `GET /api/properties` - Get all properties
- `POST /api/properties` - Create new property
- `GET /api/properties/:id` - Get property by ID
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking status

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Create payment record

### Complaints
- `GET /api/complaints` - Get all complaints
- `POST /api/complaints` - Submit complaint
- `PUT /api/complaints/:id` - Update complaint status

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id/approve` - Approve user

## 🗄️ Database Schema

The application uses MySQL with the following main tables:
- **users** - User accounts (tenant, landlord, admin)
- **properties** - Property listings
- **bookings** - Rental bookings
- **payments** - Payment records
- **complaints** - User complaints
- **transactions** - Transaction logs

## 👥 User Roles

1. **Tenant**: Can search properties, book rentals, make payments, submit complaints
2. **Landlord**: Can list properties, manage bookings, view payments
3. **Admin**: Can approve users/properties, manage all aspects of the platform

## 🔧 Development

### Backend Development
```bash
cd Backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd Frontend
npm run dev  # Vite dev server with HMR
```

## 📦 Building for Production

```bash
npm run build
```

This creates an optimized production build in `Frontend/dist/` directory.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Abhishekh Kunwar**

---

**Note**: Make sure to change the `JWT_SECRET` in the `.env` file before deploying to production!

