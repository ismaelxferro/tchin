export type Role = "TEACHER" | "STUDENT";

export type User = {
  id: string;
  email?: string | null;
  username: string;
  fullName: string;
  role: Role;
  avatarUrl?: string;
};

export type Participant = User & {
  participantType: "TEACHER" | "STUDENT";
  courseRole: "OWNER" | "CO_TEACHER" | "STUDENT";
};

export type Course = {
  id: string;
  name: string;
  description?: string;
  code: string;
  teacher?: User;
  _count?: {
    enrollments: number;
    assignments: number;
  };
};

export type Assignment = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate?: string;
  submissions?: Submission[];
};

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  pdfPath: string;
  correctedPdfPath?: string;
  teacherComment?: string;
  grade?: string | null;
  status: "SUBMITTED" | "REVIEWED";
  submittedAt: string;
  correctedAt?: string;
  student?: User;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  readAt?: string;
  sender: User;
  receiver: User;
};

export type Conversation = {
  user: User;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};