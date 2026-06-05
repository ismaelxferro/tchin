type Props = {
  title: string;
  message: string;
};

function EmptyState({ title, message }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">◎</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;