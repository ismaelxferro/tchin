type Props = {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  helper?: string;
};

function FileInput({ id, label, file, onChange, accept, helper }: Props) {
  return (
    <div className="file-input-wrapper">
      <label className="file-input-label" htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        className="hidden-file-input"
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      <div className="selected-file-box">
        <span>{file ? file.name : "No file selected"}</span>
      </div>

      {helper && <p className="small">{helper}</p>}
    </div>
  );
}

export default FileInput;