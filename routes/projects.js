const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const auth = require("../middleware/auth");
const { checkWritePermission } = require("../middleware/checkPermission");
const { cacheMiddleware } = require("../middleware/cache");
const { upload, uploadFileToSupabase } = require("../middleware/upload");

// @route   GET /api/projects
// @desc    Get all projects
// @access  Public
router.get("/", cacheMiddleware(), async (req, res) => {
  try {
    const projects = await Project.find();
    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching projects",
      error: error.message,
    });
  }
});

// @route   POST /api/projects/upload
// @desc    Upload project image
// @access  Private (Admin)
router.post(
  "/upload",
  auth,
  checkWritePermission("task11"),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // Upload to Supabase
      const supabaseResult = await uploadFileToSupabase(
        req.file,
        "projects"
      );

      res.json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          filePath: supabaseResult.filePath,
          imageUrl: supabaseResult.publicUrl,
        },
      });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading image",
        error: error.message,
      });
    }
  }
);

// @route   POST /api/projects
// @desc    Create or update project, with optional image upload
// @access  Private (Admin)
router.post(
  "/",
  auth,
  checkWritePermission("task11"),
  upload.single("image"),
  async (req, res) => {
    try {
      const projectData = { ...req.body };

      if (!projectData.name || !String(projectData.name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Project name is required",
          debug: {
            bodyKeys: Object.keys(req.body || {}),
            hasFile: Boolean(req.file),
            contentType: req.headers["content-type"] || null,
          },
        });
      }

      if (req.file) {
        const supabaseResult = await uploadFileToSupabase(req.file, "projects");
        projectData.image = supabaseResult.publicUrl;
      }

      const project = await Project.save(projectData);
      res.json({
        success: true,
        message: projectData.id
          ? "Project updated successfully"
          : "Project created successfully",
        data: project,
      });
    } catch (error) {
      console.error("Save project error:", error);
      res.status(500).json({
        success: false,
        message: "Error saving project",
        error: error.message,
      });
    }
  }
);

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (Admin)
router.delete("/:id", auth, checkWritePermission("task11"), async (req, res) => {
  try {
    await Project.delete(req.params.id);
    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting project",
      error: error.message,
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get project by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project",
      error: error.message,
    });
  }
});

module.exports = router;
