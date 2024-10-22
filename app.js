const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

let nextCourseId = 1; // Initialize the course ID counter
let nextCategoryId = 1; // Initialize the category ID counter

// Helper function to read course data from PDF files
function readCoursesFromDirectory(directory, category) {
  const courses = [];
  const files = fs.readdirSync(directory);
  
  files.forEach((file) => {
    if (path.extname(file).toLowerCase() === '.pdf') {
      const stats = fs.statSync(path.join(directory, file));
      const course = {
        id: nextCourseId++,
        title: path.basename(file, '.pdf'),
        categoryId: category.id,
        categoryName: category.name,
        progress: 0,
        icon: 'default-icon.png',
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        bgColor: '#' + Math.floor(Math.random()*16777215).toString(16),
        duration: `${Math.floor(stats.size / 1000)} min`,
        enrolledCount: Math.floor(Math.random() * 1000),
        rating: (Math.random() * 2 + 3).toFixed(1),
        nextLesson: null
      };
      courses.push(course);
    }
  });
  
  return courses;
}

// Define categories with IDs and their corresponding directories
const categories = [
  {
    id: nextCategoryId++,
    name: 'Gynecology',
    path: path.join(__dirname, 'public/courses/Gynecology')
  },
  {
    id: nextCategoryId++,
    name: 'Obstetrics',
    path: path.join(__dirname, 'public/courses/Obstetrics')
  }
  // Add more categories here as needed
];

// Create a map for easy category lookup
const categoriesMap = new Map(categories.map(cat => [cat.id, cat]));

// Read courses for each category
const coursesByCategory = {};
let allCourses = [];

categories.forEach(category => {
  coursesByCategory[category.id] = readCoursesFromDirectory(category.path, category);
  allCourses = allCourses.concat(coursesByCategory[category.id]);
});

// Function to update nextLesson for all courses
function updateNextLessons() {
  allCourses.forEach((course, index) => {
    if (index < allCourses.length - 1) {
      course.nextLesson = allCourses[index + 1].id;
    } else {
      course.nextLesson = null;
    }
  });
}

// Call updateNextLessons after all courses are loaded
updateNextLessons();

// GET all courses
app.get('/api/courses', (req, res) => {
  res.json(allCourses);
});

// GET a specific course by ID
app.get('/api/courses/:id', (req, res) => {
  const course = allCourses.find(c => c.id === parseInt(req.params.id));
  if (!course) return res.status(404).send('Course not found');
  res.json(course);
});

// POST to update course progress
app.post('/api/courses/:id/progress', (req, res) => {
  const course = allCourses.find(c => c.id === parseInt(req.params.id));
  if (!course) return res.status(404).send('Course not found');
  
  const { progress } = req.body;
  if (progress === undefined || progress < 0 || progress > 100) {
    return res.status(400).send('Invalid progress value');
  }
  
  course.progress = progress;
  res.json(course);
});

// GET courses by category ID
app.get('/api/courses/category/:categoryId', (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  
  if (coursesByCategory[categoryId]) {
    res.json(coursesByCategory[categoryId]);
  } else {
    return res.status(400).send('Invalid category ID');
  }
});

// GET available categories
app.get('/api/categories', (req, res) => {
  res.json(categories.map(cat => ({
    id: cat.id,
    name: cat.name
  })));
});

// Serve a specific PDF course file for rendering
app.get('/api/courses/:id/content', (req, res) => {
  const course = allCourses.find(c => c.id === parseInt(req.params.id));
  if (!course) return res.status(404).send('Course not found');

  const category = categoriesMap.get(course.categoryId);
  const filePath = path.join(category.path, course.title + '.pdf');

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('PDF file not found');
  }
});

// GET the next lesson for a given course
app.get('/api/courses/:id/next', (req, res) => {
  const course = allCourses.find(c => c.id === parseInt(req.params.id));
  if (!course) return res.status(404).send('Course not found');
  
  if (course.nextLesson) {
    const nextCourse = allCourses.find(c => c.id === course.nextLesson);
    res.json(nextCourse);
  } else {
    res.status(404).send('No next lesson available');
  }
});

app.listen(port, () => {
  console.log(`HaniMedTrackPro backend listening at http://localhost:${port}`);
});