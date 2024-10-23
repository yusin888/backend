const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

let nextModuleId = 1; // Initialize the module ID counter
let nextCourseId = 1; // Initialize the course ID counter

// Helper function to read module data from PDF files
function readModulesFromDirectory(directory, course) {
  const modules = [];
  const files = fs.readdirSync(directory);
  
  files.forEach((file) => {
    if (path.extname(file).toLowerCase() === '.pdf') {
      const stats = fs.statSync(path.join(directory, file));
      const module = {
        id: nextModuleId++,
        title: path.basename(file, '.pdf'),
        courseId: course.id,
        courseName: course.name,
        progress: 0,
        duration: `${Math.floor(stats.size / 1000)} min`,
        completed: false,
        type: ['video', 'reading', 'quiz'][Math.floor(Math.random() * 3)],
        description: `Description for ${path.basename(file, '.pdf')}`
      };
      modules.push(module);
    }
  });
  
  return modules;
}

// Define courses with IDs and their corresponding directories
const courses = [
  {
    id: nextCourseId++,
    name: 'Gynecology',
    path: path.join(__dirname, 'public/courses/Gynecology')
  },
  {
    id: nextCourseId++,
    name: 'Obstetrics',
    path: path.join(__dirname, 'public/courses/Obstetrics')
  },
  {
    id: nextCourseId++,
    name: 'Orthopedic Study',
    path: path.join(__dirname, 'public/courses/Orthopedic Study Resources')
  },
  {
    id: nextCourseId++,
    name: 'Emergencies In Medicine',
    path: path.join(__dirname, 'public/courses/Emergencies In Medicine')
  },
  {
    id: nextCourseId++,
    name: 'Surgery Study',
    path: path.join(__dirname, 'public/courses/Surgery Study Resources')
  }
];

// Create a map for easy course lookup
const coursesMap = new Map(courses.map(course => [course.id, course]));

// Read modules for each course
const modulesByCourse = {};
let allModules = [];

courses.forEach(course => {
  modulesByCourse[course.id] = readModulesFromDirectory(course.path, course);
  allModules = allModules.concat(modulesByCourse[course.id]);
});

// GET all modules
app.get('/api/modules', (req, res) => {
  res.json(allModules);
});

// GET a specific module by ID
app.get('/api/modules/:id', (req, res) => {
  const module = allModules.find(m => m.id === parseInt(req.params.id));
  if (!module) return res.status(404).send('Module not found');
  res.json(module);
});

// POST to update module progress
app.post('/api/modules/:id/progress', (req, res) => {
  const module = allModules.find(m => m.id === parseInt(req.params.id));
  if (!module) return res.status(404).send('Module not found');
  
  const { progress } = req.body;
  if (progress === undefined || progress < 0 || progress > 100) {
    return res.status(400).send('Invalid progress value');
  }
  
  module.progress = progress;
  module.completed = progress === 100;
  res.json(module);
});

// GET modules by course ID
app.get('/api/modules/course/:courseId', (req, res) => {
  const courseId = parseInt(req.params.courseId);
  
  if (modulesByCourse[courseId]) {
    res.json(modulesByCourse[courseId]);
  } else {
    return res.status(400).send('Invalid course ID');
  }
});

// GET available courses
app.get('/api/courses', (req, res) => {
  res.json(courses.map(course => ({
    id: course.id,
    name: course.name
  })));
});

// Serve a specific PDF module file for rendering
app.get('/api/modules/:id/content', (req, res) => {
  const module = allModules.find(m => m.id === parseInt(req.params.id));
  if (!module) return res.status(404).send('Module not found');

  const course = coursesMap.get(module.courseId);
  const filePath = path.join(course.path, module.title + '.pdf');

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('PDF file not found');
  }
});

app.listen(port, () => {
  console.log(`HaniMedTrackPro backend listening at http://localhost:${port}`);
});