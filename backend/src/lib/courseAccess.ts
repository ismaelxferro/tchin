import { prisma } from "./prisma";

export async function isCourseOwner(courseId: string, userId: string) {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      teacherId: userId,
    },
  });

  return Boolean(course);
}

export async function isCourseTeacher(courseId: string, userId: string) {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      OR: [
        { teacherId: userId },
        {
          coTeachers: {
            some: {
              teacherId: userId,
            },
          },
        },
      ],
    },
  });

  return Boolean(course);
}