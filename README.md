# STEM Learn Odisha

An interactive STEM (Science, Technology, Engineering, and Mathematics) learning platform designed to make education engaging through educational games, quizzes, assignments, and doubt-solving features.


## Demo Video

[Watch the Demo Video](https://youtu.be/oJTqxn68VPk?si=nAFVHcWq9AzKOqCb)

---

## Project Overview

STEM Learn Odisha is a web-based educational platform that helps students learn Science, Mathematics, and English through interactive activities and gamified learning experiences.

The platform provides separate dashboards for students and teachers, enabling effective content management, assignment handling, quiz participation, progress tracking, and doubt resolution.

---

## Features

### Student Features

* Student Registration and Login
* Interactive Learning Games
* Subject-wise Learning Modules
* Assignment Submission
* Quiz Participation
* Doubt Submission System
* Progress Tracking
* Profile Management

### Teacher Features

* Teacher Registration and Login
* Assignment Management
* Quiz Creation and Management
* Student Performance Monitoring
* Doubt Resolution System
* Educational Content Management

### Educational Content

* Mathematics Learning Modules
* Science Learning Modules
* English Learning Activities
* Interactive STEM Games
* Grade-wise Learning Resources

---

## Project Structure

```text
SIH-main/
│
├── home.html
├── about.html
├── contact.html
│
├── student-login.html
├── student-dashboard.html
│
├── teacher-login.html
├── teacher-dashboard.html
│
├── class-6/
│   ├── maths/
│   ├── science/
│   └── english/
│
├── uploads/
│
├── server.js
├── package.json
├── stem_learn_odisha.db
└── sessions.db
```

---

## Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* SQLite3

### Additional Packages

* bcryptjs
* multer
* cors
* express-session

---

## Dependencies

```json
{
  "express": "^4.21.2",
  "sqlite3": "^5.1.7",
  "bcryptjs": "^2.4.3",
  "multer": "^1.4.5-lts.1",
  "cors": "^2.8.5",
  "express-session": "^1.18.2"
}
```

---

## Installation

### Clone the Repository

```bash
git clone <repository-url>
cd SIH-main
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file (if required):

```env
PORT=5000
```

### Run the Server

```bash
node server.js
```

or

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

---

## Access the Application

After starting the server, open:

```text
http://localhost:5000
```

---

## Database

The application uses SQLite databases:

* stem_learn_odisha.db
* sessions.db

The backend automatically creates and manages tables for:

* Students
* Teachers
* Assignments
* Quizzes
* Games
* Doubts
* User Sessions

---

## Learning Modules

### Mathematics

* Knowing Numbers
* Fractions
* Decimal Numbers
* Geometry
* Geometrical Shapes
* Data Management
* Natural Numbers
* Measurements

### Science

* Living Things
* Objects Around Us
* Scientific Activities
* Interactive Learning Games

### English

* Vocabulary Games
* Grammar Activities
* Language Learning Exercises

---

## File Upload Support

The platform supports:

* Assignment Uploads
* Profile Picture Uploads
* Educational Resource Uploads

Uploaded files are stored in:

```text
/uploads
```

---

## Security Features

* Password Hashing using bcrypt
* Session-Based Authentication
* Input Validation
* Secure Login System
* Protected User Sessions

---

## Target Audience

* School Students
* Teachers
* Educational Institutions
* STEM Learning Programs

---

## Contributors

Developed as part of the Smart India Hackathon (SIH) initiative to promote engaging and technology-driven STEM education.

---

## Future Enhancements

* AI-Powered Doubt Solving
* Student Leaderboards
* Learning Progress Analytics
* Mobile Application Support
* Multi-Language Support
* Gamification and Reward System

---

## License

This project is developed for educational purposes under the Smart India Hackathon (SIH) initiative.
