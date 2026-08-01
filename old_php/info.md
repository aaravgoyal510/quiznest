# Quiz Management Application

## 📌 Project Overview
This project is a **PHP/MySQL based Online Quiz Management System** designed to facilitate quiz administration, student and teacher management, question management, and result tracking for educational institutions or online learning platforms.

---

## 📂 Project Structure

```
quizapp/
│
├── admin/                  # Admin Control Panel Module
│   ├── add_student.php     # Form to insert new student records into the database
│   ├── dashboard.php       # Main Admin dashboard landing page
│   ├── index.php           # Admin entry point
│   ├── logout.php          # Admin session logout handler
│   ├── navbar.php          # Top navigation bar component
│   ├── questions.php       # Question bank management (CRUD)
│   ├── quiz.php            # Quiz setup and scheduling management
│   ├── results.php         # Viewing student quiz scores & performance reports
│   ├── settings.php        # Application & system settings
│   ├── sidebar.php         # Admin dashboard sidebar menu component
│   ├── student.php         # Student management page (list, view, edit, delete actions)
│   ├── subject.php         # Subject / Course category management
│   └── teacher.php         # Teacher / Instructor management
│
├── css/                    # Static Style Resources
│   └── style.css           # Global stylesheet containing layout, dashboard, table, & form styling
│
├── database/               # Database Configuration & Scripts
│   └── db.php              # MySQL Database Connection Script (using mysqli)
│
├── images/                 # Image assets (Icons, logos, profile images)
├── includes/               # Reusable shared PHP modules/helpers (currently empty)
├── student/                # Student Portal (Portal for taking quizzes & viewing scores - pending implementation)
└── teacher/                # Teacher Portal (Portal for creating quizzes & managing questions - pending implementation)
```

---

## 🛠️ Technology Stack

- **Backend Language:** PHP (7.x / 8.x)
- **Database:** MySQL / MariaDB
- **Database Driver:** PHP `mysqli` extension
- **Frontend Technologies:** HTML5, CSS3
- **Server Environment:** Apache (XAMPP / WAMP / LAMP stack)

---

## 📊 Database Configuration

The system connects to a local MySQL server with the following default configuration (defined in [`db.php`](file:///c:/xampp/htdocs/quizapp/database/db.php)):
- **Host:** `localhost`
- **Username:** `root`
- **Password:** `""` (Empty)
- **Database Name:** `quiz_db`

### Key Database Tables expected:
- `students`: `(id, name, email, department, year, status)`

---

## 🚀 Current Features & Implementation Status

| Module / Feature | Status | Description |
|---|---|---|
| **Admin Dashboard Structure** | ✅ Implemented | Sidebar navigation, header navbar, layout shell |
| **Student Listing (`student.php`)** | ✅ Implemented | Displays student records with count, status, & action links |
| **Add Student (`add_student.php`)** | ✅ Implemented | Form to insert new student records into MySQL database |
| **Teacher Management (`teacher.php`)** | ⚠️ Skeleton | Created file, awaiting full feature implementation |
| **Subject Management (`subject.php`)** | ⚠️ Skeleton | Created file, awaiting full feature implementation |
| **Quiz Management (`quiz.php`)** | ⚠️ Skeleton | Created file, awaiting full feature implementation |
| **Questions Management (`questions.php`)**| ⚠️ Skeleton | Created file, awaiting full feature implementation |
| **Results & Reports (`results.php`)** | ⚠️ Skeleton | Created file, awaiting full feature implementation |
| **Student Portal (`/student`)** | ⏳ Pending | Directory created for student login, quiz taking, and score checking |
| **Teacher Portal (`/teacher`)** | ⏳ Pending | Directory created for teacher-specific dashboard & quiz authoring |

---

## 📝 Setup & Running Locally

1. **Start Apache & MySQL:** Launch Apache and MySQL servers via XAMPP Control Panel.
2. **Setup Database:**
   - Open `phpMyAdmin` (`http://localhost/phpmyadmin`).
   - Create a database named `quiz_db`.
   - Create a `students` table with fields `id`, `name`, `email`, `department`, `year`.
3. **Access Application:**
   - Open browser and navigate to: `http://localhost/quizapp/admin/dashboard.php`
