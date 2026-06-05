import type { User } from "../../types";
import { getInitials } from "../../utils";

type Props = {
  currentUser: User;
};

function ProfileView({ currentUser }: Props) {
  return (
    <div className="panel profile-panel">
      <h2>Profile</h2>

      <div className="profile-avatar-wrapper">
        <div className="profile-avatar">{getInitials(currentUser.fullName)}</div>
      </div>

      <div className="profile-info-card">
        <span>Name</span>
        <strong>{currentUser.fullName}</strong>
      </div>

      <div className="profile-info-card">
        <span>Username</span>
        <strong>{currentUser.username}</strong>
      </div>

      <div className="profile-info-card">
        <span>Email</span>
        <strong>{currentUser.email}</strong>
      </div>

      <div className="profile-info-card">
        <span>Role</span>
        <strong>{currentUser.role === "TEACHER" ? "Teacher" : "Student"}</strong>
      </div>
    </div>
  );
}

export default ProfileView;