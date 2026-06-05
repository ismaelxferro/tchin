import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";
import { isCourseTeacher } from "../lib/courseAccess";
import { createSignedPdfUrl, uploadPdfToStorage } from "../lib/storage";

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0];
  return param || "";
};

const getBodyValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] || "");
  return value ? String(value) : "";
};

const router = Router();

router.use(authMiddleware);

const pdfFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: pdfFileFilter,
});

const correctionUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: pdfFileFilter,
});

async function getAuthorizedSubmission(submissionId: string, userId: string) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: true,
    },
  });

  if (!submission) {
    return { submission: null, allowed: false };
  }

  if (submission.studentId === userId) {
    return { submission, allowed: true };
  }

  const allowedTeacher = await isCourseTeacher(submission.assignment.courseId, userId);

  return { submission, allowed: allowedTeacher };
}

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

      const pdfPath = await uploadPdfToStorage(
        req.file,
        `submissions/${assignmentId}/${studentId}`
      );

      const submission = await prisma.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId,
          },
        },
        update: {
          pdfPath,
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
          pdfPath,
        },
      });

      res.status(201).json(submission);
    } catch (error) {
      console.error(error);
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

router.get("/file/:submissionId/submitted", async (req, res) => {
  try {
    const submissionId = getParam(req.params.submissionId);

    if (!submissionId) {
      return res.status(400).json({ message: "Submission ID is required" });
    }

    const userId = (req as any).user.userId;
    const { submission, allowed } = await getAuthorizedSubmission(submissionId, userId);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const signedUrl = await createSignedPdfUrl(submission.pdfPath);

    res.json({ url: signedUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Open submitted PDF error" });
  }
});

router.get("/file/:submissionId/corrected", async (req, res) => {
  try {
    const submissionId = getParam(req.params.submissionId);

    if (!submissionId) {
      return res.status(400).json({ message: "Submission ID is required" });
    }

    const userId = (req as any).user.userId;
    const { submission, allowed } = await getAuthorizedSubmission(submissionId, userId);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!submission.correctedPdfPath) {
      return res.status(404).json({ message: "Corrected PDF not found" });
    }

    const signedUrl = await createSignedPdfUrl(submission.correctedPdfPath);

    res.json({ url: signedUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Open corrected PDF error" });
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

      const teacherComment = getBodyValue(req.body.teacherComment);
      const grade = getBodyValue(req.body.grade);
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

      let correctedPdfPath = submission.correctedPdfPath;

      if (req.file) {
        correctedPdfPath = await uploadPdfToStorage(
          req.file,
          `corrections/${submissionId}`
        );
      }

      const reviewedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          teacherComment: teacherComment || null,
          grade: grade || null,
          correctedPdfPath,
          status: "REVIEWED",
          correctedAt: new Date(),
        },
      });

      res.json(reviewedSubmission);
    } catch (error) {
      console.error(error);
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