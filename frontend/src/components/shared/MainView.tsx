import { useState } from "react";
import { api } from "../../api/api";
import type { User } from "../../types";
import { useAppModal } from "./AppModalProvider";

type AppView = "main" | "courses" | "profile";

type Props = {
  user: User;
  setCurrentView: (view: AppView) => void;
};

function MainView({ user, setCurrentView }: Props) {
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const { showAlert } = useAppModal();
  const [creatingCourse, setCreatingCourse] = useState(false);
const [joiningCourse, setJoiningCourse] = useState(false);

  const createCourse = async () => {
  if (creatingCourse) return;

  if (!courseName.trim()) {
    await showAlert({
      title: "Missing course name",
      message: "Course name is required.",
    });
    return;
  }

  try {
    setCreatingCourse(true);

    await api.post("/courses", {
      name: courseName,
      description: courseDescription,
    });

    setCourseName("");
    setCourseDescription("");

    await showAlert({
      title: "Course created",
      message: "The course was created successfully.",
    });

    setCurrentView("courses");
  } catch {
    await showAlert({
      title: "Could not create course",
      message: "Something went wrong while creating the course.",
    });
  } finally {
    setCreatingCourse(false);
  }
};

  const joinCourse = async () => {
  if (joiningCourse) return;

  if (!courseCode.trim()) {
    await showAlert({
      title: "Missing course code",
      message: "Course code is required.",
    });
    return;
  }

  try {
    setJoiningCourse(true);

    await api.post("/courses/join", {
      code: courseCode,
    });

    setCourseCode("");

    await showAlert({
      title: "Joined course",
      message: "You joined the course successfully.",
    });

    setCurrentView("courses");
  } catch {
    await showAlert({
      title: "Could not join course",
      message: "Check that the course code is correct.",
    });
  } finally {
    setJoiningCourse(false);
  }
};

  if (user.role === "TEACHER") {
    return (
      <>
        <div className="welcome-card">
          <h2>Welcome, {user.fullName}</h2>
          <p>Create a course, invite students, assign PDF tasks and review submissions.</p>
        </div>

        <div className="panel">
          <h2>Create course</h2>

          <input
            placeholder="Course name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />

          <textarea
            placeholder="Course description"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
          />

          <button onClick={createCourse} disabled={creatingCourse}>
  {creatingCourse ? "Creating course..." : "Create course"}
</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="welcome-card">
        <h2>Welcome, {user.fullName}</h2>
        <p>Join a course using the code your teacher gave you.</p>
      </div>

      <div className="panel">
        <h2>Join course</h2>

        <input
          placeholder="Course code"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
        />

        <button onClick={joinCourse} disabled={joiningCourse}>
  {joiningCourse ? "Joining course..." : "Join course"}
</button>
      </div>
    </>
  );
}

export default MainView;