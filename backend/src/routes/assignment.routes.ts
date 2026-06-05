import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";
import { isCourseTeacher } from "../lib/courseAccess";

const router = Router();

router.use(authMiddleware);

router.post("/", requireRole("TEACHER"), async (req, res) => {
  try {
    const { courseId, title, description, dueDate } = req.body;
    const teacherId = (req as any).user.userId;

    if (!courseId || !title || !description) {
      return res.status(400).json({ message: "Course, title and description are required" });
    }

    const allowed = await isCourseTeacher(courseId, teacherId);

    if (!allowed) {
      return res.status(403).json({ message: "You are not a teacher in this course" });
    }

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Create assignment error" });
  }
});

router.get("/course/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = (req as any).user;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (user.role === "TEACHER") {
      const allowed = await isCourseTeacher(courseId, user.userId);

      if (!allowed) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (user.role === "STUDENT") {
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId,
            studentId: user.userId,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this course" });
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      include: {
        submissions: {
          where: user.role === "STUDENT" ? { studentId: user.userId } : undefined,
        },
      },
    });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Get assignments error" });
  }
});

export default router;