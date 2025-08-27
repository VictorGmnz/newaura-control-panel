import React, { useEffect, useRef } from "react";
import UploadDocuments from "../components/UploadDocuments";

export default function ConfigDocumentsPage({ section }) {
  const colabRef = useRef(null);

  useEffect(() => {
    if (section === "colaboradores" && colabRef.current) {
      colabRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [section]);

  return (
    <div className="space-y-10">
      <UploadDocuments />
    </div>
  );
}
