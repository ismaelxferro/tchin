import { Router } from "express";
import multer from "multer";
import path from "path";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";
import { isCourseTeacher } from "../lib/courseAccess";

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};
const router = Router();

router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/submissions");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const correctionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/corrections");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }

    cb(null, true);
  },
});

const correctionUpload = multer({
  storage: correctionStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }

    cb(null, true);
  },
});

router.post(
  "/assignment/:assignmentId",
  requireRole("STUDENT"),
  upload.single("pdf"),
  async (req, res) => {
    try {
      const assignmentId = getParam(req.params.assignmentId);

      if (!assignmentId) {
        return res.status(400).json({ message: "Assignment ID is required" });
      }

      const studentId = (req as any).user.userId;

      if (!req.file) {
        return res.status(400).json({ message: "PDF file is required" });
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: true },
      });

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      const enrollment = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId: assignment.courseId,
            studentId,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this course" });
      }

      const submission = await prisma.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId,
          },
        },
        update: {
          pdfPath: req.file.path,
          status: "SUBMITTED",
          submittedAt: new Date(),
          teacherComment: null,
          grade: null,
          correctedPdfPath: null,
          correctedAt: null,
        },
        create: {
          assignmentId,
          studentId,
          pdfPath: req.file.path,
        },
      });

      res.status(201).json(submission);
    } catch (error) {
      res.status(500).json({ message: "Submit PDF error" });
    }
  }
);

router.get("/assignment/:assignmentId", requireRole("TEACHER"), async (req, res) => {
  try {
    const assignmentId = getParam(req.params.assignmentId);

    if (!assignmentId) {
      return res.status(400).json({ message: "Assignment ID is required" });
    }

    const teacherId = (req as any).user.userId;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const allowed = await isCourseTeacher(assignment.courseId, teacherId);

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Get submissions error" });
  }
});

router.patch(
  "/:submissionId/review",
  requireRole("TEACHER"),
  correctionUpload.single("correctedPdf"),
  async (req, res) => {
    try {
      const submissionId = getParam(req.params.submissionId);

      if (!submissionId) {
        return res.status(400).json({ message: "Submission ID is required" });
      }

      const { teacherComment, grade } = req.body;
      const teacherId = (req as any).user.userId;

      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          assignment: true,
        },
      });

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const allowed = await isCourseTeacher(submission.assignment.courseId, teacherId);

      if (!allowed) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validGrades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

      if (grade && !validGrades.includes(grade)) {
        return res.status(400).json({ message: "Grade must be between 1 and 10" });
      }

      const reviewedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          teacherComment,
          grade: grade || null,
          correctedPdfPath: req.file ? req.file.path : submission.correctedPdfPath,
          status: "REVIEWED",
          correctedAt: new Date(),
        },
      });

      res.json(reviewedSubmission);
    } catch (error) {
      res.status(500).json({ message: "Review submission error" });
    }
  }
);

router.get("/my/assignment/:assignmentId", requireRole("STUDENT"), async (req, res) => {
  try {
    const assignmentId = getParam(req.params.assignmentId);

    if (!assignmentId) {
      return res.status(400).json({ message: "Assignment ID is required" });
    }

    const studentId = (req as any).user.userId;

    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      include: {
        assignment: true,
      },
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: "Get student submission error" });
  }
});

export default router;