import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";
import { isCourseOwner, isCourseTeacher } from "../lib/courseAccess";

const router = Router();

router.use(authMiddleware);

function generateCourseCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function generateUniqueCourseCode() {
  let code = generateCourseCode();

  while (await prisma.course.findUnique({ where: { code } })) {
    code = generateCourseCode();
  }

  return code;
}

router.post("/", requireRole("TEACHER"), async (req, res) => {
  try {
    const { name, description } = req.body;
    const teacherId = (req as any).user.userId;

    if (!name) {
      return res.status(400).json({ message: "Course name is required" });
    }

    const code = await generateUniqueCourseCode();

    const course = await prisma.course.create({
      data: {
        name,
        description,
        code,
        teacherId,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: "Create course error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.role === "TEACHER") {
      const courses = await prisma.course.findMany({
        where: {
          OR: [
            { teacherId: user.userId },
            {
              coTeachers: {
                some: {
                  teacherId: user.userId,
                },
              },
            },
          ],
        },
        include: {
          teacher: {
            select: {
              id: true,
              fullName: true,
              email: true,
              username: true,
              role: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              assignments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(courses);
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: user.userId },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                email: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    res.json(enrollments.map((enrollment) => enrollment.course));
  } catch (error) {
    res.status(500).json({ message: "Get courses error" });
  }
});

router.post("/join", requireRole("STUDENT"), async (req, res) => {
  try {
    const { code } = req.body;
    const studentId = (req as any).user.userId;

    if (!code) {
      return res.status(400).json({ message: "Course code is required" });
    }

    const course = await prisma.course.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: course.id,
        studentId,
      },
      include: {
        course: true,
      },
    });

    res.status(201).json(enrollment.course);
  } catch (error) {
    res.status(400).json({ message: "Could not join course" });
  }
});

router.post("/:courseId/teachers", requireRole("TEACHER"), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { identifier } = req.body;
    const ownerId = (req as any).user.userId;

    if (!identifier) {
      return res.status(400).json({ message: "Teacher email or username is required" });
    }

    const owner = await isCourseOwner(courseId, ownerId);

    if (!owner) {
      return res.status(403).json({ message: "Only the owner can add teachers" });
    }

    const teacher = await prisma.user.findFirst({
      where: {
        role: "TEACHER",
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.teacherId === teacher.id) {
      return res.status(400).json({ message: "This teacher already owns the course" });
    }

    const coTeacher = await prisma.courseTeacher.create({
      data: {
        courseId,
        teacherId: teacher.id,
      },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json(coTeacher);
  } catch (error) {
    res.status(400).json({ message: "Could not add teacher" });
  }
});

router.get("/:courseId/participants", async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = (req as any).user;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
        coTeachers: {
          include: {
            teacher: {
              select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
        },
        enrollments: {
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
            joinedAt: "asc",
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const teacherAccess = await isCourseTeacher(courseId, user.userId);

    const isEnrolledStudent =
      user.role === "STUDENT" &&
      course.enrollments.some((enrollment) => enrollment.studentId === user.userId);

    if (!teacherAccess && !isEnrolledStudent) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const participants = [
      {
        ...course.teacher,
        participantType: "TEACHER",
        courseRole: "OWNER",
      },
      ...course.coTeachers.map((courseTeacher) => ({
        ...courseTeacher.teacher,
        participantType: "TEACHER",
        courseRole: "CO_TEACHER",
      })),
      ...course.enrollments.map((enrollment) => {
        const student = enrollment.student;

        return {
          ...student,
          email: teacherAccess || student.id === user.userId ? student.email : null,
          participantType: "STUDENT",
          courseRole: "STUDENT",
        };
      }),
    ];

    res.json(participants);
  } catch (error) {
    res.status(500).json({ message: "Get participants error" });
  }
});

router.delete("/:courseId/leave", requireRole("STUDENT"), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = (req as any).user.userId;

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    await prisma.courseEnrollment.delete({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
    });

    res.json({ message: "Left course successfully" });
  } catch (error) {
    res.status(500).json({ message: "Leave course error" });
  }
});

router.delete("/:courseId/teachers/:teacherId", requireRole("TEACHER"), async (req, res) => {
  try {
    const { courseId, teacherId } = req.params;
    const ownerId = (req as any).user.userId;

    const owner = await isCourseOwner(courseId, ownerId);

    if (!owner) {
      return res.status(403).json({ message: "Only the owner can remove co-teachers" });
    }

    const coTeacher = await prisma.courseTeacher.findUnique({
      where: {
        courseId_teacherId: {
          courseId,
          teacherId,
        },
      },
    });

    if (!coTeacher) {
      return res.status(404).json({ message: "Co-teacher not found" });
    }

    await prisma.courseTeacher.delete({
      where: {
        courseId_teacherId: {
          courseId,
          teacherId,
        },
      },
    });

    res.json({ message: "Co-teacher removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Remove co-teacher error" });
  }
});

router.delete("/:courseId", requireRole("TEACHER"), async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = (req as any).user.userId;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        assignments: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.teacherId !== teacherId) {
      return res.status(403).json({ message: "Only the course owner can delete this course" });
    }

    const assignmentIds = course.assignments.map((assignment) => assignment.id);

    await prisma.submission.deleteMany({
      where: {
        assignmentId: {
          in: assignmentIds,
        },
      },
    });

    await prisma.assignment.deleteMany({
      where: {
        courseId,
      },
    });

    await prisma.courseEnrollment.deleteMany({
      where: {
        courseId,
      },
    });

    await prisma.courseTeacher.deleteMany({
      where: {
        courseId,
      },
    });

    await prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete course error" });
  }
});

export default router;