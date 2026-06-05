import type { Participant } from "../../types";
import { fileUrl, getInitials } from "../../utils";

type Props = {
  participant: Participant;
  isCurrentUser: boolean;
  onSendMessage: (participant: Participant) => void;
  onRemoveCoTeacher?: (participant: Participant) => void;
};

function getParticipantRoleLabel(participant: Participant) {
  if (participant.courseRole === "OWNER") return "Teacher · Owner";
  if (participant.courseRole === "CO_TEACHER") return "Teacher · Co-teacher";
  return "Student";
}

function ParticipantCard({
  participant,
  isCurrentUser,
  onSendMessage,
  onRemoveCoTeacher,
}: Props) {
  return (
    <div className="participant-card">
      <div className="participant-left">
        {participant.avatarUrl ? (
          <img
            src={fileUrl(participant.avatarUrl)}
            alt={participant.fullName}
            className="participant-avatar-image"
          />
        ) : (
          <div className="participant-avatar">
            {getInitials(participant.fullName)}
          </div>
        )}

        <div className="participant-info">
          <div className="participant-name-row">
            <h3>{participant.fullName}</h3>
            {isCurrentUser && <span className="you-badge">You</span>}
          </div>

          {participant.email ? (
            <p className="small">{participant.email}</p>
          ) : (
            <p className="small hidden-email">Email hidden</p>
          )}

          <p className="small">{getParticipantRoleLabel(participant)}</p>
        </div>
      </div>

      <div className="participant-actions">
        {!isCurrentUser && (
          <button
            className="icon-message-button"
            onClick={() => onSendMessage(participant)}
            aria-label={`Send message to ${participant.fullName}`}
            title="Send message"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 5.8C4 4.81 4.81 4 5.8 4H18.2C19.19 4 20 4.81 20 5.8V14.2C20 15.19 19.19 16 18.2 16H9.5L5.8 19.2C5.13 19.78 4 19.3 4 18.41V5.8Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M8 8.5H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 12H13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {onRemoveCoTeacher && participant.courseRole === "CO_TEACHER" && (
          <button
            className="icon-remove-button"
            onClick={() => onRemoveCoTeacher(participant)}
            aria-label={`Remove ${participant.fullName} as co-teacher`}
            title="Remove co-teacher"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default ParticipantCard;