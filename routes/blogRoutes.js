const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/blogPosts.json');

// Helper function to read blogs
const getBlogs = () => {
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      fs.writeFileSync(dataPath, JSON.stringify([]));
      return [];
    }
    throw err;
  }
};

// Helper function to save blogs
const saveBlogs = (blogs) => {
  fs.writeFileSync(dataPath, JSON.stringify(blogs, null, 2));
};

// GET all blogs
router.get('/', (req, res) => {
  try {
    const blogs = getBlogs();
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve blog posts' });
  }
});

// GET specific blog
router.get('/:id', (req, res) => {
  try {
    const blogs = getBlogs();
    const blog = blogs.find(b => b.id === Number(req.params.id));
    if (!blog) return res.status(404).json({ error: 'Blog not found' });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve blog post' });
  }
});

// POST new blog
router.post('/', (req, res) => {
  try {
    const blogs = getBlogs();
    const newBlog = {
      id: Date.now(),
      title: req.body.title || 'Untitled',
      excerpt: req.body.excerpt || '',
      author: req.body.author || 'Anonymous',
      date: req.body.date || new Date().toISOString().split('T')[0],
      category: req.body.category || 'General',
      readTime: req.body.readTime || '5 min read',
      image: req.body.image || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=80',
      content: req.body.content || ''
    };
    blogs.push(newBlog);
    saveBlogs(blogs);
    res.status(201).json(newBlog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// PUT update blog
router.put('/:id', (req, res) => {
  try {
    const blogs = getBlogs();
    const index = blogs.findIndex(b => b.id === Number(req.params.id));
    
    if (index === -1) return res.status(404).json({ error: 'Blog not found' });

    blogs[index] = { ...blogs[index], ...req.body, id: Number(req.params.id) };
    saveBlogs(blogs);
    res.json(blogs[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// DELETE blog
router.delete('/:id', (req, res) => {
  try {
    let blogs = getBlogs();
    const newBlogs = blogs.filter(b => b.id !== Number(req.params.id));
    if (blogs.length === newBlogs.length) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    saveBlogs(newBlogs);
    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

module.exports = router;
