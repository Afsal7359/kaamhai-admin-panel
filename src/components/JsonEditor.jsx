import { useEffect, useState } from "react";

// Pretty-printed JSON textarea with live parse validation.
// onChange fires with the parsed object only when the JSON is valid.
export default function JsonEditor({ value, onChange }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState(null);

  useEffect(() => {
    setText(JSON.stringify(value ?? {}, null, 2));
    setError(null);
  }, [value]);

  const handle = (t) => {
    setText(t);
    try {
      const parsed = JSON.parse(t);
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError(e.message);
      onChange(null);
    }
  };

  return (
    <div>
      <textarea
        className="json-editor"
        value={text}
        onChange={(e) => handle(e.target.value)}
        spellCheck={false}
      />
      {error && <div className="json-error">Invalid JSON: {error}</div>}
    </div>
  );
}
