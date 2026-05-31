// server.js - Complete Backend for STEM Learn Odisha with Doubt System
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Create necessary directories
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('assignments')) fs.mkdirSync('assignments');
if (!fs.existsSync('quizzes')) fs.mkdirSync('quizzes');
if (!fs.existsSync('doubts')) fs.mkdirSync('doubts');

// Initialize SQLite database
let db;
try {
  db = new sqlite3.Database('./stem_learn_odisha.db', (err) => {
    if (err) {
      console.error('Error opening database:', err);
      process.exit(1);
    } else {
      console.log('Connected to SQLite database');
      db.run('PRAGMA foreign_keys = ON');
      initializeDatabase();
    }
  });
} catch (error) {
  console.error('Database initialization error:', error);
  process.exit(1);
}

// Initialize database tables
async function initializeDatabase() {
  try {
    // Users table
    await createTable('users', `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      grade TEXT NOT NULL,
      profilePicture TEXT,
      school TEXT DEFAULT 'Odisha Public School',
      userType TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Teachers table
    await createTable('teachers', `CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      teacherId TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      subject TEXT NOT NULL,
      profilePicture TEXT,
      school TEXT DEFAULT 'Odisha Public School',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Games table
    await createTable('games', `CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      max_score INTEGER DEFAULT 100,
      description TEXT,
      game_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Game sessions table
    await createTable('game_sessions', `CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      time_taken INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (game_id) REFERENCES games(id)
    )`);

    // Student progress table
    await createTable('student_progress', `CREATE TABLE IF NOT EXISTS student_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      completion_percentage INTEGER DEFAULT 0,
      last_played DATETIME,
      games_played INTEGER DEFAULT 0,
      average_score INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, subject, topic)
    )`);

    // Streaks table
    await createTable('streaks', `CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date DATE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Leaderboard table
    await createTable('leaderboard', `CREATE TABLE IF NOT EXISTS leaderboard (
      user_id INTEGER PRIMARY KEY,
      fullName TEXT NOT NULL,
      grade TEXT NOT NULL,
      profilePicture TEXT,
      total_score INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      average_score REAL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Assignments table
    await createTable('assignments', `CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      description TEXT NOT NULL,
      due_date DATE NOT NULL,
      class_grade TEXT NOT NULL,
      attachment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )`);

    // Quizzes table
    await createTable('quizzes', `CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      duration INTEGER DEFAULT 30,
      class_grade TEXT NOT NULL,
      total_questions INTEGER DEFAULT 10,
      max_score INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )`);

    // Quiz questions table
    await createTable('quiz_questions', `CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL CHECK(correct_answer IN ('A', 'B', 'C', 'D')),
      points INTEGER DEFAULT 10,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`);

    // Student assignments table
    await createTable('student_assignments', `CREATE TABLE IF NOT EXISTS student_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      assignment_id INTEGER NOT NULL,
      submitted BOOLEAN DEFAULT 0,
      submission_date DATETIME,
      attachment TEXT,
      grade INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, assignment_id),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
    )`);

    // Student quizzes table
    await createTable('student_quizzes', `CREATE TABLE IF NOT EXISTS student_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      started_at DATETIME,
      completed_at DATETIME,
      time_taken INTEGER,
      score INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, quiz_id),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )`);

    // Student quiz answers table
    await createTable('student_quiz_answers', `CREATE TABLE IF NOT EXISTS student_quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_quiz_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT,
      is_correct BOOLEAN DEFAULT 0,
      FOREIGN KEY (student_quiz_id) REFERENCES student_quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
    )`);

    // Doubts table (NEW)
    await createTable('doubts', `CREATE TABLE IF NOT EXISTS doubts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      attachment TEXT,
      status TEXT DEFAULT 'pending', -- pending, in-progress, resolved
      priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      resolved_by INTEGER,
      resolution_text TEXT,
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (resolved_by) REFERENCES teachers(id)
    )`);

    // Doubt comments table (NEW)
    await createTable('doubt_comments', `CREATE TABLE IF NOT EXISTS doubt_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doubt_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_type TEXT NOT NULL, -- student or teacher
      comment TEXT NOT NULL,
      attachment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Notifications table
    await createTable('notifications', `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      related_id INTEGER,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    console.log('All tables created successfully');
    await insertSampleData();
    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Helper function to create tables
function createTable(tableName, createQuery) {
  return new Promise((resolve, reject) => {
    db.run(createQuery, (err) => {
      if (err) {
        console.error(`Error creating ${tableName} table:`, err);
        reject(err);
      } else {
        console.log(`${tableName} table created/verified successfully`);
        resolve();
      }
    });
  });
}

// Insert sample data
async function insertSampleData() {
  return new Promise((resolve, reject) => {
    // Check if sample data already exists
    db.get('SELECT COUNT(*) as count FROM games', async (err, result) => {
      if (err) {
        console.error('Error checking sample data:', err);
        reject(err);
        return;
      }

      if (result.count === 0) {
        console.log('Inserting sample data...');
        
        // Sample games
        const sampleGames = [
          { name: 'Food Detective', subject: 'Science', topic: 'Food Sources', difficulty: 'Basic', max_score: 100, description: 'Classify food items', game_url: 'game6.1.1.html' },
          { name: 'Living or Non-Living?', subject: 'Science', topic: 'Living Things', difficulty: 'Basic', max_score: 50, description: 'Classify objects', game_url: 'game-living.html' },
          { name: 'Habitat Match', subject: 'Science', topic: 'Living Things', difficulty: 'Intermediate', max_score: 100, description: 'Match animals to habitats', game_url: 'game-habitat.html' },
          { name: 'Body Part Functions', subject: 'Science', topic: 'Living Things', difficulty: 'Hard', max_score: 150, description: 'Match body parts to functions', game_url: 'game-bodyparts.html' },
          { name: 'World Explorer', subject: 'Geography', topic: 'Continents and Oceans', difficulty: 'Intermediate', max_score: 200, description: 'Learn about countries', game_url: 'game6.3.2.html' },
          { name: 'Math Puzzle Challenge', subject: 'Mathematics', topic: 'Basic Operations', difficulty: 'Basic', max_score: 100, description: 'Solve math operations', game_url: 'game-math-basic.html' },
          { name: 'Fraction Fun', subject: 'Mathematics', topic: 'Fractions', difficulty: 'Intermediate', max_score: 150, description: 'Learn fractions', game_url: 'game-fractions.html' }
        ];

        // Insert games
        for (const game of sampleGames) {
          await new Promise((resolveGame, rejectGame) => {
            db.run(
              `INSERT INTO games (name, subject, topic, difficulty, max_score, description, game_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [game.name, game.subject, game.topic, game.difficulty, game.max_score, game.description, game.game_url],
              function(err) {
                if (err) {
                  console.error('Error inserting game:', err);
                  rejectGame(err);
                } else {
                  resolveGame();
                }
              }
            );
          });
        }

        // Create sample teacher
        const hashedTeacherPassword = await bcrypt.hash('teacher123', 12);
        await new Promise((resolveTeacher, rejectTeacher) => {
          db.run(
            `INSERT INTO teachers (fullName, teacherId, email, password, subject, school) VALUES (?, ?, ?, ?, ?, ?)`,
            ['John Smith', 'TCH001', 'teacher@example.com', hashedTeacherPassword, 'Science', 'Odisha Public School'],
            function(err) {
              if (err) {
                console.error('Error inserting teacher:', err);
                rejectTeacher(err);
              } else {
                console.log('Sample teacher created with ID:', this.lastID);
                resolveTeacher();
              }
            }
          );
        });

        // Create sample student (Grade 6)
        const hashedStudentPassword = await bcrypt.hash('password123', 12);
        await new Promise((resolveStudent, rejectStudent) => {
          db.run(
            `INSERT INTO users (fullName, email, password, grade, school) VALUES (?, ?, ?, ?, ?)`,
            ['Rahul Sharma', 'rahul@example.com', hashedStudentPassword, '6', 'Odisha Public School'],
            function(err) {
              if (err) {
                console.error('Error inserting student:', err);
                rejectStudent(err);
              } else {
                const userId = this.lastID;
                console.log('Sample student created with ID:', userId);
                initializeStudentProgress(userId, '6');
                initializeStreak(userId);
                updateLeaderboard(userId);
                resolveStudent();
              }
            }
          );
        });

        // Create sample assignments for Grade 6
        const sampleAssignments = [
          {
            teacher_id: 1,
            title: 'Science Homework - Chapter 1',
            subject: 'Science',
            topic: 'Living Things',
            description: 'Complete exercises 1-5 from Chapter 1 about living organisms and their characteristics.',
            due_date: '2024-12-20',
            class_grade: '6',
            status: 'active'
          },
          {
            teacher_id: 1,
            title: 'Math Practice - Fractions',
            subject: 'Mathematics',
            topic: 'Fractions',
            description: 'Solve the fraction problems in worksheet attached. Show all your work.',
            due_date: '2024-12-18',
            class_grade: '6',
            status: 'active'
          },
          {
            teacher_id: 1,
            title: 'Geography Project - Continents',
            subject: 'Geography',
            topic: 'Continents and Oceans',
            description: 'Create a project showing the 7 continents and 5 oceans with interesting facts.',
            due_date: '2024-12-25',
            class_grade: '6',
            status: 'active'
          }
        ];

        for (const assignment of sampleAssignments) {
          await new Promise((resolveAssign, rejectAssign) => {
            db.run(
              `INSERT INTO assignments (teacher_id, title, subject, topic, description, due_date, class_grade, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [assignment.teacher_id, assignment.title, assignment.subject, assignment.topic, 
               assignment.description, assignment.due_date, assignment.class_grade, assignment.status],
              function(err) {
                if (err) {
                  console.error('Error inserting assignment:', err);
                  rejectAssign(err);
                } else {
                  console.log('Sample assignment created with ID:', this.lastID);
                  resolveAssign();
                }
              }
            );
          });
        }

        // Create sample quiz for Grade 6
        await new Promise((resolveQuiz, rejectQuiz) => {
          db.run(
            `INSERT INTO quizzes (teacher_id, title, subject, description, duration, class_grade, total_questions, max_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [1, 'Science Quiz - Living Things', 'Science', 'Test your knowledge about living organisms', 30, '6', 10, 100],
            function(err) {
              if (err) {
                console.error('Error inserting quiz:', err);
                rejectQuiz(err);
              } else {
                const quizId = this.lastID;
                console.log('Sample quiz created with ID:', quizId);
                
                // Add quiz questions
                const questions = [
                  { quiz_id: quizId, question_text: 'Which is a characteristic of living things?', option_a: 'They can breathe', option_b: 'They can grow', option_c: 'They can reproduce', option_d: 'All of the above', correct_answer: 'D', points: 10 },
                  { quiz_id: quizId, question_text: 'Plants make food through:', option_a: 'Respiration', option_b: 'Photosynthesis', option_c: 'Digestion', option_d: 'Transpiration', correct_answer: 'B', points: 10 },
                  { quiz_id: quizId, question_text: 'Which of these is NOT a living thing?', option_a: 'Tree', option_b: 'Mushroom', option_c: 'Rock', option_d: 'Bacteria', correct_answer: 'C', points: 10 }
                ];
                
                questions.forEach(q => {
                  db.run(
                    `INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [q.quiz_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.points],
                    (err) => {
                      if (err) console.error('Error inserting quiz question:', err);
                    }
                  );
                });
                resolveQuiz();
              }
            }
          );
        });

        // Create sample doubt
        await new Promise((resolveDoubt, rejectDoubt) => {
          db.run(
            `INSERT INTO doubts (student_id, subject, title, description, status, priority) VALUES (?, ?, ?, ?, ?, ?)`,
            [1, 'Mathematics', 'Confusion about Fractions', 'I am having difficulty understanding how to add fractions with different denominators. Can someone explain step by step?', 'pending', 'normal'],
            function(err) {
              if (err) {
                console.error('Error inserting sample doubt:', err);
                rejectDoubt(err);
              } else {
                console.log('Sample doubt created with ID:', this.lastID);
                resolveDoubt();
              }
            }
          );
        });

        console.log('All sample data inserted successfully');
        resolve();
      } else {
        console.log('Sample data already exists');
        resolve();
      }
    });
  });
}

// Initialize student progress
function initializeStudentProgress(userId, grade) {
  const topics = [
    { subject: 'Science', topic: 'Living Things' },
    { subject: 'Science', topic: 'Measurement' },
    { subject: 'Science', topic: 'Light and Sound' },
    { subject: 'Mathematics', topic: 'Basic Operations' },
    { subject: 'Mathematics', topic: 'Fractions' },
    { subject: 'Mathematics', topic: 'Geometry' },
    { subject: 'Geography', topic: 'Continents and Oceans' },
    { subject: 'Geography', topic: 'Maps and Directions' }
  ];
  
  topics.forEach(topic => {
    db.run('INSERT OR IGNORE INTO student_progress (user_id, subject, topic) VALUES (?, ?, ?)', [userId, topic.subject, topic.topic]);
  });
}

// Initialize streak
function initializeStreak(userId) {
  db.run('INSERT OR IGNORE INTO streaks (user_id) VALUES (?)', [userId]);
}

// Update student progress
function updateStudentProgress(userId, subject, topic, score) {
  // First get current progress
  db.get('SELECT * FROM student_progress WHERE user_id = ? AND subject = ? AND topic = ?', 
    [userId, subject, topic], (err, progress) => {
      if (progress) {
        const newCompletion = Math.min(100, (progress.completion_percentage || 0) + 10);
        const newGamesPlayed = (progress.games_played || 0) + 1;
        const newTotalScore = (progress.total_score || 0) + score;
        const newAvg = Math.round(((progress.average_score || 0) * (newGamesPlayed - 1) + score) / newGamesPlayed);
        
        db.run(`
          UPDATE student_progress 
          SET completion_percentage = ?,
              games_played = ?,
              total_score = ?,
              average_score = ?,
              last_played = CURRENT_TIMESTAMP
          WHERE user_id = ? AND subject = ? AND topic = ?
        `, [newCompletion, newGamesPlayed, newTotalScore, newAvg, userId, subject, topic]);
      }
    });
}

// Update streak
function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0];
  
  db.get('SELECT * FROM streaks WHERE user_id = ?', [userId], (err, streak) => {
    if (streak) {
      const lastActivity = streak.last_activity_date;
      let newStreak = streak.current_streak;
      
      if (!lastActivity) {
        newStreak = 1;
      } else {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffTime = todayDate - lastDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
          newStreak = streak.current_streak + 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }
      
      const longestStreak = Math.max(newStreak, streak.longest_streak);
      
      db.run('UPDATE streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ? WHERE user_id = ?',
        [newStreak, longestStreak, today, userId]);
    }
  });
}

// Update leaderboard
function updateLeaderboard(userId) {
  db.get(`
    SELECT u.id, u.fullName, u.grade, u.profilePicture,
           COALESCE(SUM(gs.score), 0) as total_score,
           COUNT(gs.id) as games_played,
           COALESCE(AVG(gs.score), 0) as average_score
    FROM users u
    LEFT JOIN game_sessions gs ON u.id = gs.user_id AND gs.completed = 1
    WHERE u.id = ?
    GROUP BY u.id
  `, [userId], (err, userStats) => {
    if (userStats) {
      db.run(`
        INSERT OR REPLACE INTO leaderboard (user_id, fullName, grade, profilePicture, total_score, games_played, average_score, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userStats.id, userStats.fullName, userStats.grade, userStats.profilePicture, 
          userStats.total_score || 0, userStats.games_played || 0, userStats.average_score || 0]);
    }
  });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/';
    if (file.fieldname === 'assignmentFile') folder = 'assignments/';
    if (file.fieldname === 'doubtAttachment') folder = 'doubts/';
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ==================== AUTHENTICATION ROUTES ====================

// Student registration
app.post('/api/register', upload.single('profilePicture'), async (req, res) => {
  try {
    const { fullName, email, password, grade, school } = req.body;
    
    if (!fullName || !email || !password || !grade) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
      if (row) return res.status(400).json({ message: 'User already exists' });
      
      try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const profilePicture = req.file ? req.file.filename : null;
        const schoolName = school || 'Odisha Public School';
        
        db.run(
          'INSERT INTO users (fullName, email, password, grade, profilePicture, school) VALUES (?, ?, ?, ?, ?, ?)',
          [fullName, email, hashedPassword, grade, profilePicture, schoolName],
          function(err) {
            if (err) return res.status(500).json({ message: 'Error creating user' });
            
            const userId = this.lastID;
            initializeStudentProgress(userId, grade);
            initializeStreak(userId);
            updateLeaderboard(userId);
            
            res.status(201).json({ 
              message: 'User registered successfully',
              user: { id: userId, fullName, email, grade, profilePicture, school: schoolName }
            });
          }
        );
      } catch (hashError) {
        res.status(500).json({ message: 'Server error during registration' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Student login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (!user) return res.status(400).json({ message: 'Invalid email or password' });
      
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Invalid email or password' });
        
        updateStreak(user.id);
        
        res.status(200).json({ 
          message: 'Login successful',
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            grade: user.grade,
            profilePicture: user.profilePicture,
            school: user.school,
            userType: user.userType
          }
        });
      } catch (compareError) {
        res.status(500).json({ message: 'Server error during login' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Teacher registration
app.post('/api/teachers/register', upload.single('profilePicture'), async (req, res) => {
  try {
    const { fullName, teacherId, email, password, subject, phone, school } = req.body;
    
    if (!fullName || !teacherId || !email || !password || !subject) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    db.get('SELECT * FROM teachers WHERE teacherId = ? OR email = ?', [teacherId, email], async (err, row) => {
      if (row) return res.status(400).json({ message: 'Teacher already exists' });
      
      try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const profilePicture = req.file ? req.file.filename : null;
        const schoolName = school || 'Odisha Public School';
        
        db.run(
          'INSERT INTO teachers (fullName, teacherId, email, password, subject, profilePicture, phone, school) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [fullName, teacherId, email, hashedPassword, subject, profilePicture, phone || '', schoolName],
          function(err) {
            if (err) return res.status(500).json({ message: 'Error creating teacher' });
            
            res.status(201).json({ 
              message: 'Teacher registered successfully',
              teacher: {
                id: this.lastID,
                fullName,
                teacherId,
                email,
                subject,
                profilePicture,
                phone: phone || '',
                school: schoolName
              }
            });
          }
        );
      } catch (hashError) {
        res.status(500).json({ message: 'Server error during registration' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Teacher login
app.post('/api/teachers/login', (req, res) => {
  try {
    const { teacherId, password } = req.body;
    
    if (!teacherId || !password) {
      return res.status(400).json({ message: 'Teacher ID and password are required' });
    }

    db.get('SELECT * FROM teachers WHERE teacherId = ?', [teacherId], async (err, teacher) => {
      if (!teacher) return res.status(400).json({ message: 'Invalid Teacher ID or password' });
      
      try {
        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Invalid Teacher ID or password' });
        
        res.status(200).json({ 
          message: 'Login successful',
          teacher: {
            id: teacher.id,
            fullName: teacher.fullName,
            teacherId: teacher.teacherId,
            email: teacher.email,
            subject: teacher.subject,
            profilePicture: teacher.profilePicture,
            phone: teacher.phone,
            school: teacher.school
          }
        });
      } catch (compareError) {
        res.status(500).json({ message: 'Server error during login' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ==================== TEACHER DASHBOARD ROUTES ====================

app.get('/teacher-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'teacher-dashboard.html'));
});

// Get all students
app.get('/api/teachers/students', (req, res) => {
  db.all(`
    SELECT u.id, u.fullName, u.email, u.grade, u.profilePicture, u.school,
           COUNT(DISTINCT gs.id) as totalGamesPlayed,
           COALESCE(SUM(gs.score), 0) as totalScore,
           COALESCE(AVG(gs.score), 0) as averageScore
    FROM users u
    LEFT JOIN game_sessions gs ON u.id = gs.user_id AND gs.completed = 1
    GROUP BY u.id
    ORDER BY u.fullName
  `, (err, students) => {
    if (err) return res.status(500).json({ message: 'Error fetching students' });
    res.status(200).json(students || []);
  });
});

// Get student details
app.get('/api/teachers/students/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  
  db.get('SELECT * FROM users WHERE id = ?', [studentId], (err, student) => {
    if (err || !student) return res.status(404).json({ message: 'Student not found' });
    
    db.all('SELECT * FROM student_progress WHERE user_id = ? ORDER BY subject, topic', [studentId], (err, progress) => {
      if (err) progress = [];
      
      db.all(`
        SELECT g.name, gs.score, gs.time_taken, gs.played_at, g.subject, g.topic
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        WHERE gs.user_id = ?
        ORDER BY gs.played_at DESC
        LIMIT 10
      `, [studentId], (err, recentGames) => {
        if (err) recentGames = [];
        
        res.status(200).json({ student, progress, recentGames });
      });
    });
  });
});

// Get recent activity
app.get('/api/teachers/recent-activity', (req, res) => {
  db.all(`
    SELECT u.fullName as studentName, u.profilePicture, g.name as gameName,
           g.subject, g.topic, gs.score, gs.played_at, gs.time_taken
    FROM game_sessions gs
    JOIN users u ON gs.user_id = u.id
    JOIN games g ON gs.game_id = g.id
    WHERE gs.completed = 1
    ORDER BY gs.played_at DESC
    LIMIT 10
  `, (err, activities) => {
    if (err) return res.status(500).json({ message: 'Error fetching recent activity' });
    
    const formattedActivities = activities.map(activity => {
      const timeDiff = Date.now() - new Date(activity.played_at).getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      let timeAgo;
      if (daysAgo > 0) timeAgo = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
      else if (hoursAgo > 0) timeAgo = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
      else timeAgo = 'Just now';
      
      return {
        studentName: activity.studentName,
        profilePicture: activity.profilePicture,
        activity: `Completed ${activity.gameName} (${activity.subject} - ${activity.topic})`,
        score: `${activity.score}%`,
        time: timeAgo,
        played_at: activity.played_at
      };
    });
    
    res.status(200).json(formattedActivities);
  });
});

// Get teacher's assignments with student submissions
app.get('/api/teachers/assignments/:teacherId', (req, res) => {
  const teacherId = req.params.teacherId;
  
  db.all(`
    SELECT a.*, 
           COUNT(sa.id) as submissions_count,
           COUNT(CASE WHEN sa.submitted = 1 THEN 1 END) as submitted_count,
           GROUP_CONCAT(DISTINCT u.fullName) as submitted_students
    FROM assignments a
    LEFT JOIN student_assignments sa ON a.id = sa.assignment_id
    LEFT JOIN users u ON sa.student_id = u.id AND sa.submitted = 1
    WHERE a.teacher_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `, [teacherId], (err, assignments) => {
    if (err) {
      console.error('Error fetching assignments:', err);
      return res.status(500).json({ message: 'Error fetching assignments' });
    }
    
    // Format the assignments
    const formattedAssignments = (assignments || []).map(assignment => {
      return {
        ...assignment,
        submitted_students: assignment.submitted_students ? 
          assignment.submitted_students.split(',').slice(0, 3).join(', ') + 
          (assignment.submitted_students.split(',').length > 3 ? '...' : '') : 
          'No submissions yet'
      };
    });
    
    res.status(200).json(formattedAssignments || []);
  });
});

// Get assignment submissions with student names
app.get('/api/teachers/assignments/:assignmentId/submissions', (req, res) => {
  const assignmentId = req.params.assignmentId;
  
  db.all(`
    SELECT sa.*, u.fullName as student_name, u.grade, u.email, u.profilePicture
    FROM student_assignments sa
    JOIN users u ON sa.student_id = u.id
    WHERE sa.assignment_id = ? AND sa.submitted = 1
    ORDER BY sa.submission_date DESC
  `, [assignmentId], (err, submissions) => {
    if (err) {
      console.error('Error fetching assignment submissions:', err);
      return res.status(500).json({ message: 'Error fetching assignment submissions' });
    }
    
    res.status(200).json(submissions || []);
  });
});

// Create assignment
app.post('/api/assignments/create', upload.single('attachment'), (req, res) => {
  try {
    const { teacher_id, title, subject, topic, description, due_date, class_grade } = req.body;
    
    if (!teacher_id || !title || !subject || !due_date || !class_grade) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const attachment = req.file ? req.file.filename : null;
    
    db.run(
      `INSERT INTO assignments (teacher_id, title, subject, topic, description, due_date, class_grade, attachment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [teacher_id, title, subject, topic || '', description || '', due_date, class_grade, attachment],
      function(err) {
        if (err) {
          console.error('Error creating assignment:', err);
          return res.status(500).json({ message: 'Error creating assignment' });
        }
        
        const assignmentId = this.lastID;
        
        // Create notifications for students
        db.all('SELECT id FROM users WHERE grade = ? AND userType = "student"', [class_grade], (err, students) => {
          if (students && students.length > 0) {
            students.forEach(student => {
              db.run(
                `INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)`,
                [student.id, 'New Assignment', `New assignment "${title}" has been posted. Due: ${due_date}`, 'assignment', assignmentId]
              );
            });
          }
        });
        
        res.status(201).json({ message: 'Assignment created successfully', assignmentId });
      }
    );
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Server error creating assignment' });
  }
});

// Create quiz
app.post('/api/quizzes/create', (req, res) => {
  try {
    const { teacher_id, title, subject, description, duration, class_grade, questions } = req.body;
    
    if (!teacher_id || !title || !subject || !class_grade || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    db.run('BEGIN TRANSACTION');
    
    db.run(
      `INSERT INTO quizzes (teacher_id, title, subject, description, duration, class_grade, total_questions, max_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [teacher_id, title, subject, description || '', duration || 30, class_grade, questions.length, 100],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error creating quiz:', err);
          return res.status(500).json({ message: 'Error creating quiz' });
        }
        
        const quizId = this.lastID;
        let questionsInserted = 0;
        let hasError = false;
        
        questions.forEach((question) => {
          if (hasError) return;
          
          db.run(
            `INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [quizId, question.question_text, question.option_a, question.option_b, 
             question.option_c, question.option_d, question.correct_answer, question.points || 10],
            function(err) {
              if (err) {
                hasError = true;
                db.run('ROLLBACK');
                console.error('Error creating quiz questions:', err);
                return res.status(500).json({ message: 'Error creating quiz questions' });
              }
              
              questionsInserted++;
              
              if (questionsInserted === questions.length) {
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing quiz:', err);
                    return res.status(500).json({ message: 'Error creating quiz' });
                  }
                  
                  // Create notifications
                  db.all('SELECT id FROM users WHERE grade = ? AND userType = "student"', [class_grade], (err, students) => {
                    if (students && students.length > 0) {
                      students.forEach(student => {
                        db.run(
                          `INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)`,
                          [student.id, 'New Quiz', `New quiz "${title}" is available.`, 'quiz', quizId]
                        );
                      });
                    }
                  });
                  
                  res.status(201).json({ message: 'Quiz created successfully', quizId });
                });
              }
            }
          );
        });
      }
    );
  } catch (error) {
    db.run('ROLLBACK');
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'Server error creating quiz' });
  }
});

// Get teacher's quizzes
app.get('/api/teachers/quizzes/:teacherId', (req, res) => {
  const teacherId = req.params.teacherId;
  
  db.all(`
    SELECT q.*, COUNT(sq.id) as attempts_count,
           COUNT(CASE WHEN sq.completed_at IS NOT NULL THEN 1 END) as completed_count,
           COALESCE(AVG(sq.score), 0) as average_score
    FROM quizzes q
    LEFT JOIN student_quizzes sq ON q.id = sq.quiz_id
    WHERE q.teacher_id = ?
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `, [teacherId], (err, quizzes) => {
    if (err) return res.status(500).json({ message: 'Error fetching quizzes' });
    res.status(200).json(quizzes || []);
  });
});

// ==================== DOUBT SYSTEM ROUTES (NEW) ====================

// Post a new doubt
app.post('/api/doubts/create', upload.single('attachment'), (req, res) => {
  try {
    const { student_id, subject, title, description, priority } = req.body;
    
    if (!student_id || !subject || !title || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const attachment = req.file ? req.file.filename : null;
    
    db.run(
      `INSERT INTO doubts (student_id, subject, title, description, attachment, priority) VALUES (?, ?, ?, ?, ?, ?)`,
      [student_id, subject, title, description, attachment, priority || 'normal'],
      function(err) {
        if (err) {
          console.error('Error creating doubt:', err);
          return res.status(500).json({ message: 'Error creating doubt' });
        }
        
        const doubtId = this.lastID;
        
        // Notify all teachers about new doubt
        db.all('SELECT id FROM teachers', (err, teachers) => {
          if (teachers && teachers.length > 0) {
            teachers.forEach(teacher => {
              db.run(
                `INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)`,
                [teacher.id, 'New Doubt Posted', `Student posted a new doubt in ${subject}: "${title}"`, 'doubt', doubtId]
              );
            });
          }
        });
        
        res.status(201).json({ 
          message: 'Doubt posted successfully',
          doubtId: doubtId
        });
      }
    );
  } catch (error) {
    console.error('Error creating doubt:', error);
    res.status(500).json({ message: 'Server error creating doubt' });
  }
});

// Get doubts for student
app.get('/api/student/doubts/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  
  db.all(`
    SELECT d.*, u.fullName as student_name, u.profilePicture as student_picture,
           t.fullName as resolved_by_name
    FROM doubts d
    JOIN users u ON d.student_id = u.id
    LEFT JOIN teachers t ON d.resolved_by = t.id
    WHERE d.student_id = ?
    ORDER BY d.created_at DESC
  `, [studentId], (err, doubts) => {
    if (err) {
      console.error('Error fetching student doubts:', err);
      return res.status(500).json({ message: 'Error fetching doubts' });
    }
    
    res.status(200).json(doubts || []);
  });
});

// Get all doubts for teacher dashboard
app.get('/api/teachers/doubts', (req, res) => {
  db.all(`
    SELECT d.*, u.fullName as student_name, u.grade, u.profilePicture as student_picture,
           t.fullName as resolved_by_name
    FROM doubts d
    JOIN users u ON d.student_id = u.id
    LEFT JOIN teachers t ON d.resolved_by = t.id
    ORDER BY 
      CASE 
        WHEN d.status = 'pending' THEN 1
        WHEN d.status = 'in-progress' THEN 2
        ELSE 3
      END,
      CASE d.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        ELSE 4
      END,
      d.created_at DESC
  `, (err, doubts) => {
    if (err) {
      console.error('Error fetching doubts:', err);
      return res.status(500).json({ message: 'Error fetching doubts' });
    }
    
    res.status(200).json(doubts || []);
  });
});

// Get doubt details with comments
app.get('/api/doubts/:doubtId', (req, res) => {
  const doubtId = req.params.doubtId;
  
  db.get(`
    SELECT d.*, u.fullName as student_name, u.grade, u.profilePicture as student_picture,
           t.fullName as resolved_by_name
    FROM doubts d
    JOIN users u ON d.student_id = u.id
    LEFT JOIN teachers t ON d.resolved_by = t.id
    WHERE d.id = ?
  `, [doubtId], (err, doubt) => {
    if (err || !doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }
    
    db.all(`
      SELECT dc.*, 
             CASE 
               WHEN dc.user_type = 'student' THEN u.fullName
               ELSE t.fullName
             END as user_name,
             CASE 
               WHEN dc.user_type = 'student' THEN u.profilePicture
               ELSE t.profilePicture
             END as user_picture
      FROM doubt_comments dc
      LEFT JOIN users u ON dc.user_type = 'student' AND dc.user_id = u.id
      LEFT JOIN teachers t ON dc.user_type = 'teacher' AND dc.user_id = t.id
      WHERE dc.doubt_id = ?
      ORDER BY dc.created_at ASC
    `, [doubtId], (err, comments) => {
      if (err) comments = [];
      
      res.status(200).json({
        ...doubt,
        comments: comments
      });
    });
  });
});

// Add comment to doubt
app.post('/api/doubts/:doubtId/comments', upload.single('attachment'), (req, res) => {
  try {
    const doubtId = req.params.doubtId;
    const { user_id, user_type, comment } = req.body;
    
    if (!user_id || !user_type || !comment) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const attachment = req.file ? req.file.filename : null;
    
    db.run(
      `INSERT INTO doubt_comments (doubt_id, user_id, user_type, comment, attachment) VALUES (?, ?, ?, ?, ?)`,
      [doubtId, user_id, user_type, comment, attachment],
      function(err) {
        if (err) {
          console.error('Error adding comment:', err);
          return res.status(500).json({ message: 'Error adding comment' });
        }
        
        // Update doubt status if teacher is commenting
        if (user_type === 'teacher') {
          db.get('SELECT status FROM doubts WHERE id = ?', [doubtId], (err, doubt) => {
            if (!err && doubt && doubt.status === 'pending') {
              db.run(
                `UPDATE doubts SET status = 'in-progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [doubtId]
              );
            }
          });
          
          // Notify student about teacher's comment
          db.get('SELECT student_id FROM doubts WHERE id = ?', [doubtId], (err, doubt) => {
            if (!err && doubt) {
              db.run(
                `INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)`,
                [doubt.student_id, 'Doubt Response', 'A teacher has responded to your doubt', 'doubt_comment', doubtId]
              );
            }
          });
        }
        
        res.status(201).json({ 
          message: 'Comment added successfully',
          commentId: this.lastID
        });
      }
    );
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

// Update doubt status
app.put('/api/doubts/:doubtId/status', (req, res) => {
  try {
    const doubtId = req.params.doubtId;
    const { status, resolved_by, resolution_text } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const updates = [];
    const params = [];
    
    updates.push('status = ?');
    params.push(status);
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    if (status === 'resolved') {
      updates.push('resolved_at = CURRENT_TIMESTAMP');
      if (resolved_by) {
        updates.push('resolved_by = ?');
        params.push(resolved_by);
      }
      if (resolution_text) {
        updates.push('resolution_text = ?');
        params.push(resolution_text);
      }
    }
    
    params.push(doubtId);
    
    const query = `UPDATE doubts SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error updating doubt status:', err);
        return res.status(500).json({ message: 'Error updating doubt status' });
      }
      
      // Notify student if doubt is resolved
      if (status === 'resolved') {
        db.get('SELECT student_id FROM doubts WHERE id = ?', [doubtId], (err, doubt) => {
          if (!err && doubt) {
            db.run(
              `INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)`,
              [doubt.student_id, 'Doubt Resolved', 'Your doubt has been resolved by a teacher', 'doubt_resolved', doubtId]
            );
          }
        });
      }
      
      res.status(200).json({ 
        message: 'Doubt status updated successfully'
      });
    });
  } catch (error) {
    console.error('Error updating doubt status:', error);
    res.status(500).json({ message: 'Server error updating doubt status' });
  }
});

// Get doubt statistics for teacher dashboard
app.get('/api/teachers/doubt-stats', (req, res) => {
  db.all(`
    SELECT 
      COUNT(*) as total_doubts,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_doubts,
      COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress_doubts,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_doubts,
      COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_doubts,
      COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_doubts
    FROM doubts
  `, (err, stats) => {
    if (err) {
      console.error('Error fetching doubt stats:', err);
      return res.status(500).json({ message: 'Error fetching doubt statistics' });
    }
    
    db.all(`
      SELECT subject, COUNT(*) as count
      FROM doubts
      WHERE status != 'resolved'
      GROUP BY subject
      ORDER BY count DESC
    `, (err, subjectStats) => {
      if (err) subjectStats = [];
      
      res.status(200).json({
        ...stats[0],
        subject_stats: subjectStats
      });
    });
  });
});

// ==================== STUDENT DASHBOARD ROUTES ====================

// Get student dashboard data
app.get('/api/student/dashboard/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ message: 'User not found' });
    
    // Get game stats
    db.get(`
      SELECT COUNT(*) as totalGamesPlayed, COALESCE(SUM(score), 0) as totalScore,
             COALESCE(AVG(score), 0) as averageScore, COALESCE(MAX(score), 0) as highestScore,
             COUNT(DISTINCT game_id) as uniqueGamesPlayed, COALESCE(SUM(time_taken), 0) as totalTimePlayed
      FROM game_sessions WHERE user_id = ? AND completed = 1
    `, [userId], (err, gameStats) => {
      const stats = gameStats || {
        totalGamesPlayed: 0, totalScore: 0, averageScore: 0, highestScore: 0,
        uniqueGamesPlayed: 0, totalTimePlayed: 0
      };
      
      // Get progress by subject
      db.all(`
        SELECT subject, AVG(completion_percentage) as overallProgress,
               SUM(games_played) as gamesPlayed, AVG(average_score) as avgScore,
               SUM(total_score) as totalScore
        FROM student_progress WHERE user_id = ? GROUP BY subject
      `, [userId], (err, subjectProgress) => {
        if (err) subjectProgress = [];
        
        // Get recent games
        db.all(`
          SELECT g.name, gs.score, gs.time_taken, gs.played_at, g.subject, g.topic, g.difficulty
          FROM game_sessions gs
          JOIN games g ON gs.game_id = g.id
          WHERE gs.user_id = ? ORDER BY gs.played_at DESC LIMIT 5
        `, [userId], (err, recentGames) => {
          if (err) recentGames = [];
          
          // Get streak
          db.get('SELECT current_streak, longest_streak FROM streaks WHERE user_id = ?', [userId], (err, streak) => {
            const streakInfo = streak || { current_streak: 0, longest_streak: 0 };
            
            // Get leaderboard position
            db.get(`
              SELECT COUNT(*) + 1 as rank
              FROM leaderboard
              WHERE total_score > (SELECT total_score FROM leaderboard WHERE user_id = ?)
            `, [userId], (err, rankResult) => {
              const leaderboardRank = rankResult ? rankResult.rank : 1;
              
              // Get available games
              db.all('SELECT * FROM games ORDER BY subject, difficulty', (err, availableGames) => {
                if (err) availableGames = [];
                
                // Get pending assignments and quizzes
                db.get(`
                  SELECT 
                    (SELECT COUNT(*) FROM assignments a 
                     LEFT JOIN student_assignments sa ON a.id = sa.assignment_id AND sa.student_id = ?
                     WHERE a.class_grade = ? AND a.status = 'active' AND (sa.submitted IS NULL OR sa.submitted = 0)) as pending_assignments,
                    (SELECT COUNT(*) FROM quizzes q 
                     LEFT JOIN student_quizzes sq ON q.id = sq.quiz_id AND sq.student_id = ?
                     WHERE q.class_grade = ? AND q.status = 'active' AND sq.completed_at IS NULL) as pending_quizzes,
                    (SELECT COUNT(*) FROM doubts d 
                     WHERE d.student_id = ? AND d.status != 'resolved') as pending_doubts
                `, [userId, user.grade, userId, user.grade, userId], (err, counts) => {
                  const pending = counts || { pending_assignments: 0, pending_quizzes: 0, pending_doubts: 0 };
                  
                  const dashboardData = {
                    user: {
                      id: user.id,
                      fullName: user.fullName,
                      email: user.email,
                      grade: user.grade,
                      profilePicture: user.profilePicture,
                      school: user.school,
                      memberSince: new Date(user.created_at).toLocaleDateString('en-IN', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })
                    },
                    stats: {
                      totalGamesPlayed: stats.totalGamesPlayed || 0,
                      totalScore: stats.totalScore || 0,
                      averageScore: Math.round(stats.averageScore || 0),
                      highestScore: stats.highestScore || 0,
                      uniqueGamesPlayed: stats.uniqueGamesPlayed || 0,
                      totalTimePlayed: Math.round((stats.totalTimePlayed || 0) / 60),
                      leaderboardRank: leaderboardRank,
                      accuracy: Math.round((stats.averageScore || 0))
                    },
                    streaks: {
                      current: streakInfo.current_streak,
                      longest: streakInfo.longest_streak
                    },
                    subjectProgress: subjectProgress || [],
                    recentGames: recentGames || [],
                    availableGames: availableGames,
                    pending_assignments: pending.pending_assignments,
                    pending_quizzes: pending.pending_quizzes,
                    pending_doubts: pending.pending_doubts
                  };
                  
                  res.status(200).json(dashboardData);
                });
              });
            });
          });
        });
      });
    });
  });
});

// Get assignments for student
app.get('/api/student/assignments/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  
  console.log('Fetching assignments for student:', studentId);
  
  // First get student's grade
  db.get('SELECT grade FROM users WHERE id = ?', [studentId], (err, student) => {
    if (err || !student) {
      console.error('Student not found:', studentId, err);
      return res.status(404).json({ message: 'Student not found' });
    }
    
    console.log('Student grade:', student.grade);
    
    // Get assignments for student's grade
    db.all(`
      SELECT a.*, 
             t.fullName as teacher_name,
             sa.submitted as is_submitted,
             sa.grade as student_grade,
             sa.submission_date,
             (CASE 
                WHEN date(a.due_date) < date('now') THEN 'overdue'
                WHEN date(a.due_date) = date('now') THEN 'due-today'
                ELSE 'upcoming'
              END) as status
      FROM assignments a
      LEFT JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN student_assignments sa ON a.id = sa.assignment_id AND sa.student_id = ?
      WHERE a.class_grade = ? AND a.status = 'active'
      ORDER BY a.due_date ASC
    `, [studentId, student.grade], (err, assignments) => {
      if (err) {
        console.error('Error fetching assignments:', err);
        return res.status(500).json({ message: 'Error fetching assignments: ' + err.message });
      }
      
      console.log('Found assignments:', assignments ? assignments.length : 0);
      
      // Format dates and add days remaining
      const formattedAssignments = (assignments || []).map(assignment => {
        const dueDate = new Date(assignment.due_date);
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...assignment,
          due_date_formatted: dueDate.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          days_remaining: diffDays >= 0 ? diffDays : Math.abs(diffDays),
          is_overdue: diffDays < 0,
          is_submitted: assignment.is_submitted === 1
        };
      });
      
      res.status(200).json(formattedAssignments);
    });
  });
});

// Get quizzes for student
app.get('/api/student/quizzes/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  
  db.get('SELECT grade FROM users WHERE id = ?', [studentId], (err, student) => {
    if (err || !student) return res.status(404).json({ message: 'Student not found' });
    
    db.all(`
      SELECT q.*, t.fullName as teacher_name, sq.score as student_score,
             sq.completed_at as completed_date,
             (CASE 
                WHEN sq.completed_at IS NOT NULL THEN 'completed'
                WHEN sq.started_at IS NOT NULL THEN 'in-progress'
                ELSE 'not-started'
              END) as attempt_status
      FROM quizzes q
      LEFT JOIN teachers t ON q.teacher_id = t.id
      LEFT JOIN student_quizzes sq ON q.id = sq.quiz_id AND sq.student_id = ?
      WHERE q.class_grade = ? AND q.status = 'active'
      ORDER BY q.created_at DESC
    `, [studentId, student.grade], (err, quizzes) => {
      if (err) return res.status(500).json({ message: 'Error fetching quizzes' });
      res.status(200).json(quizzes || []);
    });
  });
});

// Get quiz with questions
app.get('/api/student/quiz/:quizId', (req, res) => {
  const quizId = req.params.quizId;
  
  db.get(`
    SELECT q.*, t.fullName as teacher_name 
    FROM quizzes q 
    LEFT JOIN teachers t ON q.teacher_id = t.id 
    WHERE q.id = ?
  `, [quizId], (err, quiz) => {
    if (err || !quiz) return res.status(404).json({ message: 'Quiz not found' });
    
    db.all(`
      SELECT id, question_text, option_a, option_b, option_c, option_d, points
      FROM quiz_questions WHERE quiz_id = ? ORDER BY id
    `, [quizId], (err, questions) => {
      if (err) return res.status(500).json({ message: 'Error fetching quiz questions' });
      
      res.status(200).json({ ...quiz, questions: questions || [] });
    });
  });
});

// Start quiz attempt
app.post('/api/student/quiz/start', (req, res) => {
  const { student_id, quiz_id } = req.body;
  
  if (!student_id || !quiz_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  db.get('SELECT * FROM student_quizzes WHERE student_id = ? AND quiz_id = ?', [student_id, quiz_id], (err, attempt) => {
    if (err) {
      console.error('Error checking quiz attempt:', err);
      return res.status(500).json({ message: 'Error starting quiz' });
    }
    
    if (attempt) {
      if (attempt.completed_at) {
        return res.status(400).json({ message: 'Quiz already completed' });
      } else {
        return res.status(200).json({ 
          message: 'Resuming quiz attempt',
          attempt_id: attempt.id,
          started_at: attempt.started_at
        });
      }
    }
    
    const startedAt = new Date().toISOString();
    db.run(
      `INSERT INTO student_quizzes (student_id, quiz_id, started_at, total_questions) 
       VALUES (?, ?, ?, (SELECT total_questions FROM quizzes WHERE id = ?))`,
      [student_id, quiz_id, startedAt, quiz_id],
      function(err) {
        if (err) {
          console.error('Error starting quiz:', err);
          return res.status(500).json({ message: 'Error starting quiz' });
        }
        
        res.status(201).json({ 
          message: 'Quiz started successfully',
          attempt_id: this.lastID,
          started_at: startedAt
        });
      }
    );
  });
});

// Submit quiz
app.post('/api/student/quiz/submit', (req, res) => {
  const { student_id, quiz_id, attempt_id, answers } = req.body;
  
  if (!student_id || !quiz_id || !attempt_id || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // First, get the quiz to check number of questions
  db.get('SELECT total_questions, max_score FROM quizzes WHERE id = ?', [quiz_id], (err, quiz) => {
    if (err || !quiz) {
      console.error('Error fetching quiz:', err);
      return res.status(500).json({ message: 'Error submitting quiz: Quiz not found' });
    }
    
    let correctCount = 0;
    let totalScore = 0;
    const completedAt = new Date().toISOString();
    
    // Process answers
    const processAnswers = async () => {
      try {
        for (const answer of answers) {
          const { question_id, selected_answer } = answer;
          
          // Get question details
          const question = await new Promise((resolve, reject) => {
            db.get('SELECT correct_answer, points FROM quiz_questions WHERE id = ?', [question_id], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          
          if (!question) {
            console.error('Question not found:', question_id);
            continue;
          }
          
          const isCorrect = selected_answer === question.correct_answer;
          
          if (isCorrect) {
            correctCount++;
            totalScore += question.points;
          }
          
          // Save answer
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO student_quiz_answers (student_quiz_id, question_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)`,
              [attempt_id, question_id, selected_answer, isCorrect ? 1 : 0],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
        
        // Get time taken
        const attempt = await new Promise((resolve, reject) => {
          db.get('SELECT started_at FROM student_quizzes WHERE id = ?', [attemptId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (!attempt) {
          throw new Error('Quiz attempt not found');
        }
        
        const timeTaken = Math.floor((new Date(completedAt) - new Date(attempt.started_at)) / 1000);
        
        // Update quiz attempt
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE student_quizzes SET completed_at = ?, time_taken = ?, score = ?, correct_answers = ? WHERE id = ?`,
            [completedAt, timeTaken, totalScore, correctCount, attempt_id],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        // Get quiz subject for progress update
        const quizDetails = await new Promise((resolve, reject) => {
          db.get('SELECT subject FROM quizzes WHERE id = ?', [quiz_id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (quizDetails) {
          updateStudentProgress(student_id, quizDetails.subject, 'Quiz', totalScore);
          updateStreak(student_id);
          updateLeaderboard(student_id);
        }
        
        // Calculate percentage
        const percentage = Math.round((totalScore / (answers.length * 10)) * 100);
        
        res.status(200).json({
          message: 'Quiz submitted successfully',
          score: totalScore,
          correct_answers: correctCount,
          total_questions: answers.length,
          percentage: percentage,
          time_taken: timeTaken
        });
        
      } catch (error) {
        console.error('Error processing quiz submission:', error);
        res.status(500).json({ message: 'Error submitting quiz: ' + error.message });
      }
    };
    
    processAnswers();
  });
});

// Submit assignment
app.post('/api/student/assignment/submit', upload.single('attachment'), (req, res) => {
  const { student_id, assignment_id } = req.body;
  
  if (!student_id || !assignment_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  const attachment = req.file ? req.file.filename : null;
  const submissionDate = new Date().toISOString();
  
  db.run(
    `INSERT OR REPLACE INTO student_assignments (student_id, assignment_id, submitted, submission_date, attachment) 
     VALUES (?, ?, 1, ?, ?)`,
    [student_id, assignment_id, submissionDate, attachment],
    function(err) {
      if (err) {
        console.error('Error submitting assignment:', err);
        return res.status(500).json({ message: 'Error submitting assignment' });
      }
      
      // Notify teacher
      db.get('SELECT teacher_id, title FROM assignments WHERE id = ?', [assignment_id], (err, assignment) => {
        if (!err && assignment) {
          db.get('SELECT fullName FROM users WHERE id = ?', [student_id], (err, student) => {
            if (!err && student) {
              db.run(
                `INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)`,
                [assignment.teacher_id, 'Assignment Submitted', 
                 `Student ${student.fullName} submitted assignment "${assignment.title}"`, 
                 'assignment_submission', assignment_id]
              );
            }
          });
        }
      });
      
      res.status(200).json({ 
        message: 'Assignment submitted successfully',
        submission_id: this.lastID,
        submission_date: submissionDate
      });
    }
  );
});

// Get notifications
app.get('/api/student/notifications/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  
  db.all(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 20
  `, [studentId], (err, notifications) => {
    if (err) return res.status(500).json({ message: 'Error fetching notifications' });
    res.status(200).json(notifications || []);
  });
});

// Mark notification as read
app.put('/api/student/notifications/:notificationId/read', (req, res) => {
  const notificationId = req.params.notificationId;
  
  db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId], function(err) {
    if (err) return res.status(500).json({ message: 'Error updating notification' });
    res.status(200).json({ message: 'Notification marked as read' });
  });
});

// ==================== GAME MANAGEMENT ROUTES ====================

// Save game result
app.post('/api/game/save-result', (req, res) => {
  const { userId, gameName, score, timeTaken, completed = true } = req.body;
  
  if (!userId || !gameName || score === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  db.get('SELECT id, subject, topic, max_score FROM games WHERE name = ?', [gameName], (err, game) => {
    if (err || !game) return res.status(404).json({ message: 'Game not found' });
    
    const normalizedScore = Math.min(Math.round((score / game.max_score) * 100), 100);
    
    db.run(
      'INSERT INTO game_sessions (user_id, game_id, score, time_taken, completed) VALUES (?, ?, ?, ?, ?)',
      [userId, game.id, normalizedScore, timeTaken || 0, completed ? 1 : 0],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error saving game result' });
        
        updateStudentProgress(userId, game.subject, game.topic, normalizedScore);
        updateStreak(userId);
        updateLeaderboard(userId);
        
        res.status(200).json({ 
          message: 'Game result saved successfully',
          sessionId: this.lastID,
          normalizedScore: normalizedScore
        });
      }
    );
  });
});

// Save game result with ranking
app.post('/api/game/save-result-with-rank', (req, res) => {
  const { userId, gameName, score, timeTaken, completed = true } = req.body;
  
  if (!userId || !gameName || score === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  db.get('SELECT id, subject, topic, max_score FROM games WHERE name = ?', [gameName], (err, game) => {
    if (err || !game) return res.status(404).json({ message: 'Game not found' });
    
    const normalizedScore = Math.min(Math.round((score / game.max_score) * 100), 100);
    
    db.run(
      'INSERT INTO game_sessions (user_id, game_id, score, time_taken, completed) VALUES (?, ?, ?, ?, ?)',
      [userId, game.id, normalizedScore, timeTaken || 0, completed ? 1 : 0],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error saving game result' });
        
        updateStudentProgress(userId, game.subject, game.topic, normalizedScore);
        updateStreak(userId);
        updateLeaderboard(userId);
        
        // Calculate rank
        db.all(`
          SELECT user_id, MAX(score) as best_score
          FROM game_sessions 
          WHERE game_id = ? AND completed = 1
          GROUP BY user_id
          ORDER BY best_score DESC
        `, [game.id], (err, scores) => {
          let rank = 1;
          if (scores) {
            for (const s of scores) {
              if (s.user_id == userId) break;
              rank++;
            }
          }
          
          db.get('SELECT fullName, profilePicture FROM users WHERE id = ?', [userId], (err, user) => {
            res.status(200).json({ 
              message: 'Game result saved successfully',
              sessionId: this.lastID,
              normalizedScore: normalizedScore,
              rawScore: score,
              rank: rank,
              totalPlayers: scores ? scores.length : 0,
              user: {
                id: userId,
                fullName: user ? user.fullName : 'Unknown',
                profilePicture: user ? user.profilePicture : null
              }
            });
          });
        });
      }
    );
  });
});

// Get leaderboard for a game
app.get('/api/game/leaderboard/:gameName', (req, res) => {
  const gameName = req.params.gameName;
  
  db.get('SELECT id FROM games WHERE name = ?', [gameName], (err, game) => {
    if (err || !game) return res.status(404).json({ message: 'Game not found' });
    
    db.all(`
      SELECT u.id as user_id, u.fullName, u.profilePicture, u.grade,
             MAX(gs.score) as best_score, MIN(gs.played_at) as first_achieved, COUNT(*) as attempts
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      WHERE gs.game_id = ? AND gs.completed = 1
      GROUP BY u.id
      ORDER BY best_score DESC, first_achieved ASC
      LIMIT 10
    `, [game.id], (err, results) => {
      if (err) return res.status(500).json({ message: 'Error fetching leaderboard' });
      
      const leaderboard = [];
      let currentRank = 1;
      
      for (let i = 0; i < results.length; i++) {
        const player = results[i];
        
        if (i > 0 && player.best_score === results[i - 1].best_score) {
          player.rank = currentRank;
        } else {
          currentRank = i + 1;
          player.rank = currentRank;
        }
        
        player.score = player.best_score;
        delete player.best_score;
        
        leaderboard.push(player);
      }
      
      res.status(200).json(leaderboard || []);
    });
  });
});

// Get games
app.get('/api/games', (req, res) => {
  db.all('SELECT * FROM games ORDER BY subject, difficulty', (err, games) => {
    if (err) return res.status(500).json({ message: 'Error fetching games' });
    res.status(200).json(games || []);
  });
});

// Get games by subject
app.get('/api/games/subject/:subject', (req, res) => {
  const subject = req.params.subject;
  db.all('SELECT * FROM games WHERE subject = ? ORDER BY difficulty', [subject], (err, games) => {
    if (err) return res.status(500).json({ message: 'Error fetching games' });
    res.status(200).json(games || []);
  });
});

// ==================== BASIC HTML ROUTES ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-login.html'));
});

app.get('/student-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-dashboard.html'));
});

app.get('/student-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-login.html'));
});

app.get('/teacher-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'teacher-login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-register.html'));
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 STEM Learn Odisha Server Started Successfully!');
  console.log('='.repeat(60));
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`👨‍🎓 Student Portal: http://localhost:${PORT}/student-login`);
  console.log(`👨‍🏫 Teacher Portal: http://localhost:${PORT}/teacher-login`);
  console.log(`📊 Student Dashboard: http://localhost:${PORT}/student-dashboard`);
  console.log(`📊 Teacher Dashboard: http://localhost:${PORT}/teacher-dashboard`);
  console.log('='.repeat(60));
  console.log('✅ Doubt System: Enabled');
  console.log('✅ Students can post doubts in STEM subjects');
  console.log('✅ Teachers can view and resolve doubts');
  console.log('='.repeat(60));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server gracefully...');
  db.close((err) => {
    if (err) console.error('❌ Error closing database:', err);
    else console.log('✓ Database connection closed.');
    console.log('👋 Server stopped. Goodbye!\n');
    process.exit(0);
  });
}); 