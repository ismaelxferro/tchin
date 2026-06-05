import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

async function getUserCourseIds(userId: string) {
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { teacherId: userId },
        {
          coTeachers: {
            some: {
              teacherId: userId,
            },
          },
        },
        {
          enrollments: {
            some: {
              studentId: userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return courses.map((course) => course.id);
}

async function canMessageUser(currentUserId: string, otherUserId: string) {
  if (currentUserId === otherUserId) return false;

  const currentUserCourseIds = await getUserCourseIds(currentUserId);
  const otherUserCourseIds = await getUserCourseIds(otherUserId);

  return currentUserCourseIds.some((courseId) =>
    otherUserCourseIds.includes(courseId)
  );
}

router.get("/unread-count", async (req, res) => {
  try {
    const currentUserId = (req as any).user.userId;

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: currentUserId,
        readAt: null,
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Get unread count error" });
  }
});

router.get("/conversations", async (req, res) => {
  try {
    const currentUserId = (req as any).user.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
        receiver: {
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

    const conversationsMap = new Map();

    messages.forEach((message) => {
      const otherUser =
        message.senderId === currentUserId ? message.receiver : message.sender;

      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          unreadCount: 0,
        });
      }

      if (
        message.receiverId === currentUserId &&
        message.senderId === otherUser.id &&
        message.readAt === null
      ) {
        const conversation = conversationsMap.get(otherUser.id);
        conversation.unreadCount += 1;
      }
    });

    res.json(Array.from(conversationsMap.values()));
  } catch (error) {
    res.status(500).json({ message: "Get conversations error" });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const currentUserId = (req as any).user.userId;
    const { userId } = req.params;

    const allowed = await canMessageUser(currentUserId, userId);

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: currentUserId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: currentUserId,
            receiverId: userId,
          },
          {
            senderId: userId,
            receiverId: currentUserId,
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
        receiver: {
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

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Get messages error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const senderId = (req as any).user.userId;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: "Receiver and content are required" });
    }

    const allowed = await canMessageUser(senderId, receiverId);

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
          },
        },
        receiver: {
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

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Send message error" });
  }
});

export default router;