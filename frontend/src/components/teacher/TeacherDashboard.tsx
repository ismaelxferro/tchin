import { useEffect, useState } from "react";
import { api } from "../../api/api";
import type { Assignment, Course, Participant, Submission, User } from "../../types";
import { fileUrl, formatDateUS, isLateSubmission } from "../../utils";
import ParticipantCard from "../shared/ParticipantCard";
import FileInput from "../shared/FileInput";
import { useAppModal } from "../shared/AppModalProvider";
import EmptyState from "../shared/EmptyState";

type Props = {
  currentUser: User;
  setChatTarget: (user: User | null) => void;
};

type TeacherCourseTab = "participants" | "assignments" | "create" | "delete";

function TeacherDashboard({ currentUser, setChatTarget }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseTab, setCourseTab] = useState<TeacherCourseTab>("participants");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [correctedFiles, setCorrectedFiles] = useState<Record<string, File | null>>({});
  const [coTeacherIdentifier, setCoTeacherIdentifier] = useState("");
  
  const [creatingAssignment, setCreatingAssignment] = useState(false);
const [deletingCourse, setDeletingCourse] = useState(false);
const [addingCoTeacher, setAddingCoTeacher] = useState(false);
const [removingCoTeacherId, setRemovingCoTeacherId] = useState<string | null>(null);
const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string | null>(null);

const [grades, setGrades] = useState<Record<string, string>>({});
  
  const { showAlert, showConfirm } = useAppModal();

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

  const loadSubmissions = async (assignmentId: string) => {
    const response = await api.get(`/submissions/assignment/${assignmentId}`);
    setSubmissions(response.data);
  };
  

  useEffect(() => {
    loadCourses();
  }, []);
  
  const isOwner = participants.some(
  (participant) =>
    participant.id === currentUser.id && participant.courseRole === "OWNER"
  );

  const openCourse = async (course: Course) => {
    setSelectedCourse(course);
    setSelectedAssignment(null);
    setCourseTab("participants");
    await loadParticipants(course.id);
    await loadAssignments(course.id);
  };

  const backToCourses = async () => {
    await loadCourses();
    setSelectedAssignment(null);
    setSelectedCourse(null);
  };

  const createAssignment = async () => {
  if (!selectedCourse || creatingAssignment) return;

  if (!assignmentTitle.trim() || !assignmentDescription.trim()) {
    await showAlert({
      title: "Missing assignment data",
      message: "Title and description are required.",
    });
    return;
  }

  try {
    setCreatingAssignment(true);

    await api.post("/assignments", {
      courseId: selectedCourse.id,
      title: assignmentTitle,
      description: assignmentDescription,
      dueDate: dueDate || null,
    });

    setAssignmentTitle("");
    setAssignmentDescription("");
    setDueDate("");

    await showAlert({
      title: "Assignment created",
      message: "The assignment was created successfully.",
    });

    await loadAssignments(selectedCourse.id);
    await loadCourses();
  } catch {
    await showAlert({
      title: "Could not create assignment",
      message: "Something went wrong while creating the assignment.",
    });
  } finally {
    setCreatingAssignment(false);
  }
};
  const openAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    await loadSubmissions(assignment.id);
  };

 const reviewSubmission = async (submissionId: string) => {
  if (reviewingSubmissionId) return;

  const formData = new FormData();

  formData.append("teacherComment", comments[submissionId] || "");
  formData.append("grade", grades[submissionId] || "");

  const file = correctedFiles[submissionId];

  if (file) {
    formData.append("correctedPdf", file);
  }

  try {
    setReviewingSubmissionId(submissionId);

    await api.patch(`/submissions/${submissionId}/review`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await showAlert({
      title: "Submission reviewed",
      message: "The submission was reviewed successfully.",
    });

    if (selectedAssignment) {
      await loadSubmissions(selectedAssignment.id);
    }

    if (selectedCourse) {
      await loadAssignments(selectedCourse.id);
      await loadCourses();
    }
  } catch {
    await showAlert({
      title: "Could not review submission",
      message: "Something went wrong while reviewing this submission.",
    });
  } finally {
    setReviewingSubmissionId(null);
  }
};
  
  const addCoTeacher = async () => {
  if (!selectedCourse || addingCoTeacher) return;

  if (!coTeacherIdentifier.trim()) {
    await showAlert({
      title: "Missing teacher",
      message: "Teacher email or username is required.",
    });
    return;
  }

  try {
    setAddingCoTeacher(true);

    await api.post(`/courses/${selectedCourse.id}/teachers`, {
      identifier: coTeacherIdentifier,
    });

    setCoTeacherIdentifier("");
    await loadParticipants(selectedCourse.id);
    await loadCourses();

    await showAlert({
      title: "Co-teacher added",
      message: "The teacher was added to the course successfully.",
    });
  } catch {
    await showAlert({
      title: "Could not add co-teacher",
      message: "Check that the teacher exists and is not already part of the course.",
    });
  } finally {
    setAddingCoTeacher(false);
  }
};

const removeCoTeacher = async (participant: Participant) => {
  if (!selectedCourse || removingCoTeacherId) return;

  const confirmed = await showConfirm({
    title: "Remove co-teacher",
    message: `Remove ${participant.fullName} as co-teacher?`,
    confirmText: "Remove",
    cancelText: "Cancel",
    danger: true,
  });

  if (!confirmed) return;

  try {
    setRemovingCoTeacherId(participant.id);

    await api.delete(`/courses/${selectedCourse.id}/teachers/${participant.id}`);

    await loadParticipants(selectedCourse.id);
    await loadCourses();

    await showAlert({
      title: "Co-teacher removed",
      message: "The co-teacher was removed successfully.",
    });
  } catch {
    await showAlert({
      title: "Could not remove co-teacher",
      message: "Something went wrong while removing this co-teacher.",
    });
  } finally {
    setRemovingCoTeacherId(null);
  }
};

 const deleteCourse = async () => {
  if (!selectedCourse || deletingCourse) return;

  const confirmed = await showConfirm({
    title: "Delete course",
    message: `Delete "${selectedCourse.name}"? This will remove all assignments, submissions and enrollments.`,
    confirmText: "Delete course",
    cancelText: "Cancel",
    danger: true,
  });

  if (!confirmed) return;

  try {
    setDeletingCourse(true);

    await api.delete(`/courses/${selectedCourse.id}`);

    await showAlert({
      title: "Course deleted",
      message: "The course was deleted successfully.",
    });

    setSelectedCourse(null);
    setSelectedAssignment(null);
    await loadCourses();
  } catch {
    await showAlert({
      title: "Could not delete course",
      message: "Something went wrong while deleting the course.",
    });
  } finally {
    setDeletingCourse(false);
  }
};

  if (selectedCourse && selectedAssignment) {
    return (
      <>
        <button
          className="secondary"
          onClick={async () => {
            setSelectedAssignment(null);
            await loadAssignments(selectedCourse.id);
          }}
        >
          Back to assignments
        </button>

        <div className="panel">
          <h2>{selectedAssignment.title}</h2>
          <p>{selectedAssignment.description}</p>
          <p className="small">Due: {formatDateUS(selectedAssignment.dueDate)}</p>
        </div>

        <div className="panel">
          <h2>Submissions</h2>

          {submissions.length === 0 && (
  <EmptyState
    title="No submissions yet"
    message="Once students submit their PDFs, they will appear here."
  />
)}

          {submissions.map((submission) => (
  <div className="course-card submission-card" key={submission.id}>
    <div className="submission-student-row">
      <div className="submission-student-info">
        <h3>{submission.student?.fullName}</h3>
        <p className="small">{submission.student?.email}</p>
      </div>
    </div>

    <div className="card-meta-row">
      <span
        className={
          isLateSubmission(selectedAssignment.dueDate, submission.submittedAt)
            ? "meta-pill danger"
            : "meta-pill success"
        }
      >
        {isLateSubmission(selectedAssignment.dueDate, submission.submittedAt)
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

    <div className="card-actions">
      <a
  className="file-action-link submitted"
  href={fileUrl(submission.pdfPath)}
  target="_blank"
  rel="noreferrer"
>
  View submitted PDF
</a>
    </div>

    <textarea
      placeholder="Teacher comment"
      value={comments[submission.id] || submission.teacherComment || ""}
      onChange={(e) =>
        setComments({
          ...comments,
          [submission.id]: e.target.value,
        })
      }
    />
	<select
  value={grades[submission.id] || submission.grade || ""}
  onChange={(e) =>
    setGrades({
      ...grades,
      [submission.id]: e.target.value,
    })
  }
>
  <option value="">No grade</option>
  <option value="1">1/10</option>
  <option value="2">2/10</option>
  <option value="3">3/10</option>
  <option value="4">4/10</option>
  <option value="5">5/10</option>
  <option value="6">6/10</option>
  <option value="7">7/10</option>
  <option value="8">8/10</option>
  <option value="9">9/10</option>
  <option value="10">10/10</option>
</select>

    <FileInput
      id={`correction-${submission.id}`}
      label="Attach corrected PDF"
      accept="application/pdf"
      file={correctedFiles[submission.id] ?? null}
      helper="Optional: upload a corrected PDF for the student."
      onChange={(file) =>
        setCorrectedFiles({
          ...correctedFiles,
          [submission.id]: file,
        })
      }
    />

    {submission.teacherComment && (
      <div className="teacher-comment-box">
        <p>
          <strong>Current comment:</strong> {submission.teacherComment}
        </p>
      </div>
    )}

    {submission.correctedPdfPath && (
      <div className="card-actions">
        <a
  className="file-action-link corrected"
  href={fileUrl(submission.correctedPdfPath)}
  target="_blank"
  rel="noreferrer"
>
  View corrected PDF
</a>
      </div>
    )}

    <div className="card-actions">
      <button
  onClick={() => reviewSubmission(submission.id)}
  disabled={reviewingSubmissionId === submission.id}
>
  {reviewingSubmissionId === submission.id
    ? "Reviewing..."
    : "Review submission"}
</button>
    </div>
  </div>
))}
        </div>
      </>
    );
  }

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
    <span className="course-hero-pill">Code: {selectedCourse.code}</span>
    <span className="course-hero-pill">
      {participants.filter((participant) => participant.courseRole === "STUDENT").length} students
    </span>
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
			className={courseTab === "assignments" ? "tab-button active" : "tab-button"}
			onClick={() => setCourseTab("assignments")}
			>
			Assignments
		  </button>

          <button
            className={courseTab === "create" ? "tab-button active" : "tab-button"}
            onClick={() => setCourseTab("create")}
          >
            Create assignment
          </button>

          {isOwner && (
            <button
              className={courseTab === "delete" ? "tab-button danger active" : "tab-button danger"}
              onClick={() => setCourseTab("delete")}
            >
              Delete course
            </button>
          )}
        </div>

        {courseTab === "participants" && (
  <div className="panel">
    <h2>Participants</h2>

    {isOwner && (
      <div className="add-teacher-box">
        <h3>Add co-teacher</h3>

        <input
          placeholder="Teacher email or username"
          value={coTeacherIdentifier}
          onChange={(e) => setCoTeacherIdentifier(e.target.value)}
        />

        <button onClick={addCoTeacher} disabled={addingCoTeacher}>
  {addingCoTeacher ? "Adding teacher..." : "Add teacher"}
</button>
      </div>
    )}

    {participants.map((participant) => (
      <ParticipantCard
        key={participant.id}
        participant={participant}
        isCurrentUser={participant.id === currentUser.id}
        onSendMessage={(selectedParticipant) => setChatTarget(selectedParticipant)}
		  onRemoveCoTeacher={isOwner ? removeCoTeacher : undefined}

      />
    ))}
  </div>
)}

        {courseTab === "create" && (
  <div className="panel">
    <h2>Create assignment</h2>

    <input
      placeholder="Assignment title"
      value={assignmentTitle}
      onChange={(e) => setAssignmentTitle(e.target.value)}
    />

    <textarea
      placeholder="Assignment description"
      value={assignmentDescription}
      onChange={(e) => setAssignmentDescription(e.target.value)}
    />

    <input
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
    />

    <button onClick={createAssignment} disabled={creatingAssignment}>
  {creatingAssignment ? "Creating assignment..." : "Create assignment"}
</button>
  </div>
)}

{courseTab === "assignments" && (
  <div className="panel">
    <h2>Assignments</h2>

    {assignments.length === 0 && (
  <EmptyState
    title="No assignments yet"
    message="Create your first assignment from the Create assignment tab."
  />
)}

    {assignments.map((assignment) => (
  <div className="course-card" key={assignment.id}>
    <div className="card-header-row">
      <div className="card-title-block">
        <h3>{assignment.title}</h3>
        <p>{assignment.description}</p>
      </div>
    </div>

    <div className="card-meta-row">
      <span className="meta-pill">Due: {formatDateUS(assignment.dueDate)}</span>
      <span className="meta-pill">
        {assignment.submissions?.length ?? 0} submissions
      </span>
    </div>

    <div className="card-actions">
      <button onClick={() => openAssignment(assignment)}>
        Open submissions
      </button>
    </div>
  </div>
))}
  </div>
)}



        {courseTab === "delete" && isOwner && (
  <div className="panel">
    <h2>Delete course</h2>

    <p>
      This action cannot be undone. It will delete assignments, submissions and
      enrollments.
    </p>

    <button
      className="danger-button"
      onClick={deleteCourse}
      disabled={deletingCourse}
    >
      {deletingCourse ? "Deleting course..." : "Delete course"}
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
    message="Create your first course from the Main section."
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
      <span className="meta-pill">Code: {course.code}</span>
      <span className="meta-pill">{course._count?.enrollments ?? 0} students</span>
      <span className="meta-pill">{course._count?.assignments ?? 0} assignments</span>
    </div>

    <div className="card-actions">
      <button onClick={() => openCourse(course)}>Open course</button>
    </div>
  </div>
))}
  </div>
);
}

export default TeacherDashboard;