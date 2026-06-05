import { useEffect, useState } from "react";
import { api } from "../../api/api";
import type { Assignment, Course, Participant, User } from "../../types";
import { formatDateUS, isLateSubmission } from "../../utils";
import ParticipantCard from "../shared/ParticipantCard";
import FileInput from "../shared/FileInput";
import { useAppModal } from "../shared/AppModalProvider";
import EmptyState from "../shared/EmptyState";

type Props = {
  currentUser: User;
  setChatTarget: (user: User | null) => void;
};

type StudentCourseTab = "participants" | "due" | "done" | "leave";

function StudentDashboard({ currentUser, setChatTarget }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseTab, setCourseTab] = useState<StudentCourseTab>("due");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const { showAlert, showConfirm } = useAppModal();
  
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
const [leavingCourse, setLeavingCourse] = useState(false);
  
  
  const loadCourses = async () => {
    const response = await api.get("/courses");
    setCourses(response.data);
  };

  const loadAssignments = async (courseId: string) => {
    const response = await api.get(`/assignments/course/${courseId}`);
    setAssignments(response.data);
  };

  const loadParticipants = async (courseId: string) => {
    const response = await api.get(`/courses/${courseId}/participants`);
    setParticipants(response.data);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  

  const openCourse = async (course: Course) => {
    setSelectedCourse(course);
    setCourseTab("due");
    await loadParticipants(course.id);
    await loadAssignments(course.id);
  };

  const backToCourses = async () => {
    setSelectedCourse(null);
    await loadCourses();
  };

  const submitPdf = async (assignmentId: string) => {
  if (submittingAssignmentId) return;

  const file = selectedFiles[assignmentId];

  if (!file) {
    await showAlert({
      title: "Missing PDF",
      message: "Select a PDF first.",
    });
    return;
  }

  const formData = new FormData();
  formData.append("pdf", file);

  try {
    setSubmittingAssignmentId(assignmentId);

    await api.post(`/submissions/assignment/${assignmentId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await showAlert({
      title: "Submission uploaded",
      message: "Your PDF was uploaded successfully.",
    });

    if (selectedCourse) {
      await loadAssignments(selectedCourse.id);
    }
  } catch {
    await showAlert({
      title: "Could not upload submission",
      message: "Something went wrong while uploading your PDF.",
    });
  } finally {
    setSubmittingAssignmentId(null);
  }
};

  const leaveCourse = async () => {
  if (!selectedCourse || leavingCourse) return;

  const confirmed = await showConfirm({
    title: "Leave course",
    message: `Leave "${selectedCourse.name}"? You will no longer have access to assignments or corrections in this course.`,
    confirmText: "Leave course",
    cancelText: "Cancel",
    danger: true,
  });

  if (!confirmed) return;

  try {
    setLeavingCourse(true);

    await api.delete(`/courses/${selectedCourse.id}/leave`);

    await showAlert({
      title: "Left course",
      message: "You left the course successfully.",
    });

    setSelectedCourse(null);
    await loadCourses();
  } catch {
    await showAlert({
      title: "Could not leave course",
      message: "Something went wrong while leaving this course.",
    });
  } finally {
    setLeavingCourse(false);
  }
};


const openSubmittedPdf = async (submissionId: string) => {
  try {
    const response = await api.get(`/submissions/file/${submissionId}/submitted`);

    if (!response.data.url) {
      await showAlert({
        title: "Could not open PDF",
        message: "No PDF URL was returned.",
      });
      return;
    }

    window.location.href = response.data.url;
  } catch (error: any) {
    await showAlert({
      title: "Could not open PDF",
      message:
        error.response?.data?.message ||
        error.message ||
        "Something went wrong while opening the submitted PDF.",
    });
  }
};

const openCorrectedPdf = async (submissionId: string) => {
  try {
    const response = await api.get(`/submissions/file/${submissionId}/corrected`);

    if (!response.data.url) {
      await showAlert({
        title: "Could not open PDF",
        message: "No PDF URL was returned.",
      });
      return;
    }

    window.location.href = response.data.url;
  } catch (error: any) {
    await showAlert({
      title: "Could not open PDF",
      message:
        error.response?.data?.message ||
        error.message ||
        "Something went wrong while opening the corrected PDF.",
    });
  }
};

  const dueAssignments = assignments.filter((assignment) => {
    const submission = assignment.submissions?.[0];
    return !submission;
  });

  const doneAssignments = assignments.filter((assignment) => {
    const submission = assignment.submissions?.[0];
    return Boolean(submission);
  });

  if (selectedCourse) {
    return (
      <>
        <button className="secondary" onClick={backToCourses}>
          Back to courses
        </button>

        <div className="course-hero">
  <h2>{selectedCourse.name}</h2>

  {selectedCourse.description && (
    <p>{selectedCourse.description}</p>
  )}

  <div className="course-hero-meta">
    <span className="course-hero-pill">
      Teacher: {selectedCourse.teacher?.fullName}
    </span>

    {selectedCourse.teacher?.email && (
      <span className="course-hero-pill">
        {selectedCourse.teacher.email}
      </span>
    )}

    <span className="course-hero-pill">
      {assignments.length} assignments
    </span>
  </div>
</div>

        <div className="course-tabs">
          <button
            className={courseTab === "participants" ? "tab-button active" : "tab-button"}
            onClick={() => setCourseTab("participants")}
          >
            Participants
          </button>

          <button
            className={courseTab === "due" ? "tab-button active" : "tab-button"}
            onClick={() => setCourseTab("due")}
          >
            Due assignments
          </button>

          <button
            className={courseTab === "done" ? "tab-button active" : "tab-button"}
            onClick={() => setCourseTab("done")}
          >
            Done assignments
          </button>

          <button
            className={courseTab === "leave" ? "tab-button danger active" : "tab-button danger"}
            onClick={() => setCourseTab("leave")}
          >
            Leave course
          </button>
        </div>

        {courseTab === "participants" && (
			<div className="panel">
			<h2>Participants</h2>

			{participants.map((participant) => (
				<ParticipantCard
				key={participant.id}
				participant={participant}
				isCurrentUser={participant.id === currentUser.id}
				onSendMessage={(selectedParticipant) => setChatTarget(selectedParticipant)}
					/>
				))}
			</div>
		)}

        {courseTab === "due" && (
          <div className="panel">
            <h2>Due assignments</h2>

            {dueAssignments.length === 0 && (
  <EmptyState
    title="No due assignments"
    message="You are up to date. New assignments will appear here."
  />
)}

            {dueAssignments.map((assignment) => (
  <div className="course-card" key={assignment.id}>
    <div className="card-header-row">
      <div className="card-title-block">
        <h3>{assignment.title}</h3>
        <p>{assignment.description}</p>
      </div>
    </div>

    <div className="card-meta-row">
      <span className="meta-pill warning">
        Due: {formatDateUS(assignment.dueDate)}
      </span>
      <span className="meta-pill">Pending</span>
    </div>

    <FileInput
      id={`submission-${assignment.id}`}
      label="Choose PDF"
      accept="application/pdf"
      file={selectedFiles[assignment.id] ?? null}
      helper="Upload your assignment as a PDF file."
      onChange={(file) =>
        setSelectedFiles({
          ...selectedFiles,
          [assignment.id]: file,
        })
      }
    />

    <div className="card-actions">
      <button
  onClick={() => submitPdf(assignment.id)}
  disabled={submittingAssignmentId === assignment.id}
>
  {submittingAssignmentId === assignment.id ? "Submitting..." : "Submit PDF"}
</button>
    </div>
  </div>
))}
          </div>
        )}

        {courseTab === "done" && (
          <div className="panel">
            <h2>Done assignments</h2>

            {doneAssignments.length === 0 && (
  <EmptyState
    title="No submitted assignments"
    message="Your submitted assignments and corrections will appear here."
  />
)}

            {doneAssignments.map((assignment) => {
              const submission = assignment.submissions?.[0];

              if (!submission) return null;

              return (
  <div className="course-card" key={assignment.id}>
    <div className="card-header-row">
      <div className="card-title-block">
        <h3>{assignment.title}</h3>
        <p>{assignment.description}</p>
      </div>
    </div>

    <div className="card-meta-row">
      <span className="meta-pill">Due: {formatDateUS(assignment.dueDate)}</span>

      <span
        className={
          isLateSubmission(assignment.dueDate, submission.submittedAt)
            ? "meta-pill danger"
            : "meta-pill success"
        }
      >
        {isLateSubmission(assignment.dueDate, submission.submittedAt)
          ? `${submission.status} · Late`
          : submission.status}
      </span>
	  {submission.grade && (
  <span
    className={
      Number(submission.grade) <= 5
        ? "meta-pill danger"
        : "meta-pill success"
    }
  >
    Grade: {submission.grade}/10
  </span>
)}
    </div>

    {submission.teacherComment && (
  <div className="teacher-comment-box">
    <p>
      <strong>Teacher comment:</strong> {submission.teacherComment}
    </p>
  </div>
)}

    <div className="card-actions">
      <button
  className="file-action-link submitted"
  onClick={() => openSubmittedPdf(submission.id)}
>
  View submitted PDF
</button>

      {submission.correctedPdfPath && (
  <button
  className="file-action-link corrected"
  onClick={() => openCorrectedPdf(submission.id)}
>
  View corrected PDF
</button>
)}
    </div>
  </div>
);
            })}
          </div>
        )}

        {courseTab === "leave" && (
          <div className="panel">
            <h2>Leave course</h2>
            <p>You will no longer have access to assignments or corrections in this course.</p>

            <button className="danger-button" onClick={leaveCourse} disabled={leavingCourse}>
  {leavingCourse ? "Leaving course..." : "Leave course"}
</button>
          </div>
        )}
      </>
    );
  }

  return (
  <div className="panel">
    <h2>Your courses</h2>

    {courses.length === 0 && (
  <EmptyState
    title="No courses yet"
    message="Join a course from the Main section using a course code."
  />
)}

    {courses.map((course) => (
  <div className="course-card" key={course.id}>
    <div className="card-header-row">
      <div className="card-title-block">
        <h3>{course.name}</h3>
        <p>{course.description}</p>
      </div>
    </div>

    <div className="card-meta-row">
      <span className="meta-pill">Teacher: {course.teacher?.fullName}</span>
    </div>

    <p className="small">{course.teacher?.email}</p>

    <div className="card-actions">
      <button onClick={() => openCourse(course)}>Open course</button>
    </div>
  </div>
))}
  </div>
);


}

export default StudentDashboard;