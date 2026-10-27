"use client";

import { useState } from "react";

export function FileUploadField({
  id,
  name,
  accept,
  required,
  ariaLabelledby,
  existingFileName,
}) {
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileName = selectedFileName || existingFileName;
  const label = fileName
    ? `File: ${fileName} (Click to Reupload)`
    : "Add File";

  return (
    <label className="application-file-button" htmlFor={id}>
      <span className="application-file-button-label" title={label}>
        {label}
      </span>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        aria-labelledby={ariaLabelledby}
        onChange={(event) =>
          setSelectedFileName(event.currentTarget.files?.[0]?.name ?? "")
        }
      />
    </label>
  );
}
