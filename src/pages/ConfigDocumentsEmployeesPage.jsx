import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import UploadEmployeeDocsForRole from "../components/UploadEmployeeDocsForRole";
import { FaTrash } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const hasAll = (arr = []) => arr.includes("all_pages") || arr.includes("*");
const canEditDocs = (arr = []) =>
  hasAll(arr) || arr.includes("config_documents") || arr.includes("config_root");

export default function ConfigDocumentsEmployeesPage() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const allowed = useMemo(
    () => (Array.isArray(user?.allowed_pages) ? user.allowed_pages : []),
    [user]
  );
  const isAdmin = useMemo(() => hasAll(allowed), [allowed]);
  const canEdit = useMemo(() => canEditDocs(allowed), [allowed]);
  const myRoleId = user?.role_id;

  const [roleName, setRoleName] = useState("");
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleId) return;
    if (!isAdmin && Number(roleId) !== Number(myRoleId)) {
      navigate("/configuracoes/documentos", { replace: true });
    }
  }, [roleId, isAdmin, myRoleId, navigate]);

  useEffect(() => {
    if (!isAdmin && !roleId) {
      const rid = Number(myRoleId);
      if (Number.isFinite(rid) && rid > 0) {
        navigate(`/configuracoes/documentos/colaboradores/${rid}`, { replace: true });
      }
    }
  }, [isAdmin, roleId, myRoleId, navigate]);

  async function fetchDocs() {
    if (!roleId) return;
    setLoading(true);
    setErr("");
    try {
      const res = await authFetch(
        `${API_URL}/company/roles/${roleId}/documents?is_employee_doc=true`
      );
      if (!res.ok)
        throw new Error((await res.json())?.detail || "Falha ao carregar documentos do setor.");
      const data = await res.json();
      setRoleName(data?.role || "");
      setDocs(data?.documents || []);
    } catch (e) {
      setErr(e?.message || "Erro ao carregar documentos.");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
  }, [roleId]);

  return (
    <div className="bg-transparent">
      {canEdit && (
        <UploadEmployeeDocsForRole
          roleId={roleId}
          roleName={roleName}
          onUploaded={fetchDocs}
        />
      )}
    </div>
  );
}