// src/pages/ConfigCustomersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/apiClient";
import { useAuth } from "../utils/authData";
import UploadCustomerDocs from "../components/UploadCustomerDocs";

const PAGE_SIZE = 20;

function classNames(...c) {
  return c.filter(Boolean).join(" ");
}
function useDebouncedValue(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
function onlyDigits(s = "") {
  return (s || "").replace(/\D+/g, "");
}
function normalizeBrPhone(n) {
  const d = onlyDigits(n);
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) return d.slice(2);
  return d.slice(-11);
}
function formatBrPhone(d) {
  const x = normalizeBrPhone(d);
  if (x.length === 10) return `(${x.slice(0, 2)}) ${x.slice(2, 6)}-${x.slice(6)}`;
  if (x.length === 11) return `(${x.slice(0, 2)}) ${x.slice(2, 7)}-${x.slice(7)}`;
  return d || "";
}
function joinNSN(ddd, number) {
  return onlyDigits(String(ddd || "") + String(number || ""));
}
function splitNSN(nsn) {
  const d = normalizeBrPhone(nsn);
  if (!d) return { ddd: "", number: "" };
  return { ddd: d.slice(0, 2), number: d.slice(2) };
}

const VALID_UF = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]);
function isValidEmail(e = "") {
  if (!e) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(e);
}
function isValidCEP(cep = "") {
  return onlyDigits(cep).length === 8;
}
function isValidUF(uf = "") {
  return VALID_UF.has(String(uf || "").trim().toUpperCase().slice(0, 2));
}
function isValidPhoneNSN(nsn = "") {
  const d = onlyDigits(nsn);
  return d.length === 10 || d.length === 11;
}
function isValidCPF(cpf = "") {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (seq, f) => {
    const s = seq.split("").reduce((acc, n, i) => acc + Number(n) * (f - i), 0);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(d.slice(0, 9), 10);
  const d2 = dv(d.slice(0, 9) + d1, 11);
  return d.slice(9) === `${d1}${d2}`;
}
function isValidCNPJ(cnpj = "") {
  const c = onlyDigits(cnpj);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const dv = (seq, pesos) => {
    const s = seq.split("").reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(c.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = dv(c.slice(0, 12) + d1, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return c.slice(12) === `${d1}${d2}`;
}

function Modal({ open, onClose, children, maxWidth = "max-w-5xl" }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className={classNames("relative w-full", maxWidth)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-h-[90vh] overflow-hidden">
          <div className="overflow-y-auto max-h-[90vh]">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ConfigCustomersPage() {
  const { user, token } = useAuth();
  const companyId = user?.company_id;

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 450);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formTab, setFormTab] = useState("perfil");
  const [formErrors, setFormErrors] = useState({});

  const emptyForm = {
    customer: "",
    trade_name: "",
    segment: "",
    person_type: "PJ",
    cpf_cnpj: "",
    representative_name: "",
    description: "",
    notes: "",

    mail: "",
    mail_alt1: "",
    mail_alt2: "",
    website_url: "",
    social_type: "",
    social_handle: "",

    phonesUI: [
      { ddd: "", number: "", type: "mobile", label: "Principal", contact_name: "", is_primary: true },
      { ddd: "", number: "", type: "mobile", label: "Adicional 1", contact_name: "", is_primary: false },
      { ddd: "", number: "", type: "mobile", label: "Adicional 2", contact_name: "", is_primary: false },
    ],

    address: { street: "", number: "", complement: "", zipcode: "", city: "", state: "" },

    accepts_feedback: true,
  };
  const [form, setForm] = useState(emptyForm);

  const [openPhones, setOpenPhones] = useState(false);
  const [phoneCustomer, setPhoneCustomer] = useState(null);
  const [phones, setPhones] = useState([]);
  const [newPhone, setNewPhone] = useState({
    ddd: "", number: "", label: "", type: "mobile", contact_name: "", is_primary: false,
  });

  // ----- Pesquisa de satisfação (UI state) -----
  const [surveyForm, setSurveyForm] = useState(null);
  const [surveyQuestions, setSurveyQuestions] = useState([]);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyMsg, setSurveyMsg] = useState("");
  const [surveyErr, setSurveyErr] = useState("");

  // editor visual para "Adicionar pergunta"
  const [newQuestion, setNewQuestion] = useState({
    prompt: "",
    q_type: "single",
    required: true,
    optionsFields: [], // <— opções visuais (sem JSON)
    min_value: 0,
    max_value: 10,
    order_index: 0,
  });

  // edição inline das perguntas existentes (evita useState dentro do map)
  const [surveyEdit, setSurveyEdit] = useState({}); // id -> objeto editável

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / PAGE_SIZE)), [total]);

  const withAuth = (cfg = {}) => ({
    ...cfg,
    headers: { ...(cfg.headers || {}), Authorization: `Bearer ${token}` },
  });

  useEffect(() => {
    if (!companyId || !token) return;
    fetchList(1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, companyId, token]);

  async function fetchList(p = 1, qq = "") {
    try {
      setLoading(true);
      const resp = await api.get("/company/customers", withAuth({
        params: { company_id: companyId, q: qq || undefined, page: p, limit: PAGE_SIZE },
      }));
      const data = resp?.data || {};
      const rows = data.items || data.customers || [];
      setList(rows);
      setTotal(Number(data.total ?? rows.length ?? 0));
      setPage(Number(data.page || p || 1));
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormTab("perfil");
    setOpenForm(true);
  }

  function openEdit(c) {
    setEditing(c);
    setFormErrors({});
    setFormTab("perfil");

    const f = { ...emptyForm };
    f.customer = (c.customer || "").slice(0, 255);
    f.trade_name = (c.trade_name || "").slice(0, 255);
    f.segment = (c.segment || "").slice(0, 120);
    f.person_type = c.person_type || "PJ";
    f.cpf_cnpj = (c.cpf_cnpj || "").slice(0, 20);
    f.representative_name = (c.representative_name || "").slice(0, 255);
    f.description = c.description || "";
    f.notes = (c.notes || "").slice(0, 255);

    f.mail = (c.mail || "").slice(0, 255);
    f.mail_alt1 = (c.mail_alt1 || "").slice(0, 255);
    f.mail_alt2 = (c.mail_alt2 || "").slice(0, 255);
    f.website_url = (c.website_url || "").slice(0, 255);
    f.social_type = (c.social_type || "").slice(0, 20);
    f.social_handle = (c.social_handle || "").slice(0, 120);
    f.accepts_feedback = !!c.accepts_feedback;

    if (c.address) {
      f.address = {
        street: (c.address.street || "").slice(0, 255),
        number: (c.address.number || "").slice(0, 20),
        complement: (c.address.complement || "").slice(0, 100),
        zipcode: onlyDigits(c.address.zipcode || "").slice(0, 8),
        city: (c.address.city || "").slice(0, 120),
        state: (c.address.state || "").slice(0, 2),
      };
    }

    const prim = (c.phones || []).find(p => p.is_primary) || c.phones?.[0];
    const adAll = (c.phones || []).filter(p => !p.is_primary);
    const ad1 = adAll[0]; const ad2 = adAll[1];

    const p1 = prim ? { ...splitNSN(prim.phone_nsn), type: prim.type || "mobile", label: (prim.label || "Principal").slice(0,40), contact_name: (prim.contact_name || "").slice(0,120), is_primary: true } : emptyForm.phonesUI[0];
    const p2 = ad1  ? { ...splitNSN(ad1.phone_nsn),  type: ad1.type || "mobile",  label: (ad1.label || "Adicional 1").slice(0,40), contact_name: (ad1.contact_name || "").slice(0,120), is_primary: false } : emptyForm.phonesUI[1];
    const p3 = ad2  ? { ...splitNSN(ad2.phone_nsn),  type: ad2.type || "mobile",  label: (ad2.label || "Adicional 2").slice(0,40), contact_name: (ad2.contact_name || "").slice(0,120), is_primary: false } : emptyForm.phonesUI[2];

    f.phonesUI = [p1, p2, p3];

    setForm(f);
    setOpenForm(true);
  }

  function openDocs(c) {
    openEdit(c);
    setFormTab("documentos");
  }

  function openSurvey(c) {
    openEdit(c);
    setFormTab("pesquisa");
    loadSurveyData(c.id);
  }

  function setFormPatch(p) {
    setForm(prev => ({ ...prev, ...p }));
  }
  function setFormAddrPatch(p) {
    setForm(prev => ({ ...prev, address: { ...prev.address, ...p } }));
  }
  function setPhoneUI(i, patch) {
    setForm(prev => {
      const arr = [...prev.phonesUI];
      arr[i] = { ...arr[i], ...patch };
      if (patch.is_primary && i !== 0) {
        arr.forEach((x, idx) => (arr[idx] = { ...arr[idx], is_primary: idx === i }));
      }
      return { ...prev, phonesUI: arr };
    });
  }

  function setError(field, msg) {
    setFormErrors((e) => ({ ...e, [field]: msg }));
  }
  function clearErrors() {
    setFormErrors({});
  }

  function validateBeforeSubmit(isEditing) {
    clearErrors();
    let ok = true;

    if (!form.customer?.trim()) { setError("customer", "Obrigatório."); ok = false; }
    if (!form.trade_name?.trim()) { setError("trade_name", "Obrigatório."); ok = false; }
    if (!form.segment?.trim()) { setError("segment", "Obrigatório."); ok = false; }
    if (!["PF", "PJ"].includes(form.person_type)) { setError("person_type", "Selecione PF ou PJ."); ok = false; }

    const doc = onlyDigits(form.cpf_cnpj);
    if (!doc) { setError("cpf_cnpj", "Obrigatório."); ok = false; }
    else if (form.person_type === "PF" && !isValidCPF(doc)) { setError("cpf_cnpj", "CPF inválido."); ok = false; }
    else if (form.person_type === "PJ" && !isValidCNPJ(doc)) { setError("cpf_cnpj", "CNPJ inválido."); ok = false; }

    if (!form.representative_name?.trim()) { setError("representative_name", "Obrigatório."); ok = false; }
    if (!form.description?.trim()) { setError("description", "Obrigatório."); ok = false; }

    if (form.customer.length > 255) { setError("customer", "Máx. 255."); ok = false; }
    if (form.trade_name.length > 255) { setError("trade_name", "Máx. 255."); ok = false; }
    if (form.segment.length > 120) { setError("segment", "Máx. 120."); ok = false; }
    if (doc.length > 20) { setError("cpf_cnpj", "Máx. 20 dígitos."); ok = false; }
    if ((form.representative_name || "").length > 255) { setError("representative_name", "Máx. 255."); ok = false; }
    if ((form.notes || "").length > 255) { setError("notes", "Máx. 255."); ok = false; }

    if (!form.mail?.trim() || !isValidEmail(form.mail)) { setError("mail", "E-mail inválido."); ok = false; }
    if (form.mail.length > 255) { setError("mail", "Máx. 255."); ok = false; }
    if (form.mail_alt1 && !isValidEmail(form.mail_alt1)) { setError("mail_alt1", "E-mail inválido."); ok = false; }
    if (form.mail_alt2 && !isValidEmail(form.mail_alt2)) { setError("mail_alt2", "E-mail inválido."); ok = false; }
    if ((form.mail_alt1 || "").length > 255) { setError("mail_alt1", "Máx. 255."); ok = false; }
    if ((form.mail_alt2 || "").length > 255) { setError("mail_alt2", "Máx. 255."); ok = false; }
    if ((form.website_url || "").length > 255) { setError("website_url", "Máx. 255."); ok = false; }
    if ((form.social_type || "").length > 20) { setError("social_type", "Máx. 20."); ok = false; }
    if ((form.social_handle || "").length > 120) { setError("social_handle", "Máx. 120."); ok = false; }

    if (!isEditing) {
      const nsn = joinNSN(form.phonesUI[0].ddd, form.phonesUI[0].number);
      if (!isValidPhoneNSN(nsn)) { setError("phone0", "DDD+Número inválidos."); ok = false; }
    }

    const a = form.address || {};
    if (!a.street?.trim()) { setError("street", "Obrigatório."); ok = false; }
    if (!a.number?.trim()) { setError("number", "Obrigatório."); ok = false; }
    if (!isValidCEP(a.zipcode)) { setError("zipcode", "CEP inválido (8 dígitos)."); ok = false; }
    if (!a.city?.trim()) { setError("city", "Obrigatório."); ok = false; }
    if (!isValidUF(a.state)) { setError("state", "UF inválida."); ok = false; }

    if (a.street.length > 255) { setError("street", "Máx. 255."); ok = false; }
    if (a.number.length > 20) { setError("number", "Máx. 20."); ok = false; }
    if ((a.complement || "").length > 100) { setError("complement", "Máx. 100."); ok = false; }
    if (onlyDigits(a.zipcode).length > 8) { setError("zipcode", "Máx. 8 dígitos."); ok = false; }
    if (a.city.length > 120) { setError("city", "Máx. 120."); ok = false; }
    if ((a.state || "").length > 2) { setError("state", "Máx. 2."); ok = false; }

    if (typeof form.accepts_feedback !== "boolean") { setError("accepts_feedback", "Obrigatório."); ok = false; }

    return ok;
  }

  function buildPayload(isEditing) {
    let phones = [];
    if (!isEditing) {
      phones = form.phonesUI
        .map((p, idx) => {
          const nsn = joinNSN(p.ddd, p.number);
          if (!nsn) return null;
          return {
            phone_nsn: nsn,
            label: (p.label || (idx === 0 ? "Principal" : `Adicional ${idx}`)).slice(0, 40),
            type: (p.type || "mobile").slice(0, 20),
            contact_name: (p.contact_name || null) ? String(p.contact_name).slice(0, 120) : null,
            is_primary: idx === 0 ? true : !!p.is_primary,
          };
        })
        .filter(Boolean);
    }

    return {
      customer: form.customer.trim().slice(0, 255),
      trade_name: form.trade_name.trim().slice(0, 255),
      segment: form.segment.trim().slice(0, 120),
      person_type: form.person_type,
      cpf_cnpj: onlyDigits(form.cpf_cnpj).slice(0, 20),
      representative_name: (form.representative_name || "").trim().slice(0, 255) || null,
      description: (form.description || "").trim() || null,
      notes: (form.notes || "").trim().slice(0, 255) || null,

      mail: form.mail.trim().slice(0, 255),
      mail_alt1: (form.mail_alt1 || "").trim().slice(0, 255) || null,
      mail_alt2: (form.mail_alt2 || "").trim().slice(0, 255) || null,
      website_url: (form.website_url || "").trim().slice(0, 255) || null,
      social_type: (form.social_type || "").trim().slice(0, 20) || null,
      social_handle: (form.social_handle || "").trim().slice(0, 120) || null,

      accepts_feedback: !!form.accepts_feedback,

      address: {
        street: form.address.street.trim().slice(0, 255),
        number: form.address.number.trim().slice(0, 20),
        complement: (form.address.complement || "").trim().slice(0, 100) || null,
        zipcode: onlyDigits(form.address.zipcode).slice(0, 8),
        city: form.address.city.trim().slice(0, 120),
        state: form.address.state.trim().toUpperCase().slice(0, 2),
      },

      ...(phones.length ? { phones } : {}),
    };
  }

  async function submitForm(e) {
    e?.preventDefault?.();
    const isEditing = !!editing?.id;
    if (!validateBeforeSubmit(isEditing)) return;

    const payload = buildPayload(isEditing);

    try {
      if (isEditing) {
        await api.put(`/company/customers/${editing.id}`, payload, withAuth({
          params: { company_id: companyId },
        }));
        alert("Cliente atualizado!");
      } else {
        await api.post("/company/customers", payload, withAuth({
          params: { company_id: companyId },
        }));
        alert("Cliente criado!");
      }
      setOpenForm(false);
      fetchList(page, q);
    } catch (e) {
      console.error(e);
      const detail = e?.response?.data?.detail;
      alert(detail ? String(detail) : "Erro ao salvar cliente.");
    }
  }

  async function removeCustomer(c) {
    if (!window.confirm(`Remover o cliente "${c.trade_name || c.customer}"?`)) return;
    try {
      await api.delete(`/company/customers/${c.id}`, withAuth({
        params: { company_id: companyId },
      }));
      fetchList(page, q);
    } catch (e) {
      console.error(e);
      alert("Erro ao remover cliente.");
    }
  }

  function openPhonesModal(c) {
    setPhoneCustomer(c);
    setNewPhone({ ddd: "", number: "", label: "", type: "mobile", contact_name: "", is_primary: false });
    setPhones(Array.isArray(c.phones) ? c.phones : []);
    setOpenPhones(true);
  }

  async function refreshPhonesAfterChange() {
    try {
      const resp = await api.get("/company/customers", withAuth({
        params: { company_id: companyId, q: q || undefined, page, limit: PAGE_SIZE },
      }));
      const data = resp?.data || {};
      const items = data.items || data.customers || [];
      setList(items);
      setTotal(Number(data.total ?? items.length ?? 0));
      const updated = items.find(x => x.id === phoneCustomer?.id);
      if (updated) setPhones(updated.phones || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function addPhone(e) {
    e?.preventDefault?.();
    const nsn = joinNSN(newPhone.ddd, newPhone.number);
    if (!isValidPhoneNSN(nsn)) {
      alert("Telefone inválido. Use DDD + número (10 ou 11 dígitos).");
      return;
    }
    try {
      await api.post(
        `/company/customers/${phoneCustomer.id}/phones`,
        {
          phone_nsn: nsn,
          label: (newPhone.label || "").slice(0, 40) || null,
          type: (newPhone.type || "mobile").slice(0, 20),
          contact_name: (newPhone.contact_name || "").slice(0, 120) || null,
          is_primary: !!newPhone.is_primary,
        },
        withAuth({ params: { company_id: companyId } })
      );
      await refreshPhonesAfterChange();
      setNewPhone({ ddd: "", number: "", label: "", type: "mobile", contact_name: "", is_primary: false });
    } catch (e) {
      console.error(e);
      const detail = e?.response?.data?.detail;
      alert(detail ? String(detail) : "Erro ao adicionar telefone.");
    }
  }

  async function removePhone(ph) {
    if (!window.confirm("Remover este telefone?")) return;
    try {
      await api.delete(
        `/company/customers/${phoneCustomer.id}/phones/${ph.id}`,
        withAuth({ params: { company_id: companyId } })
      );
      await refreshPhonesAfterChange();
    } catch (e) {
      console.error(e);
      const detail = e?.response?.data?.detail;
      alert(detail ? String(detail) : "Erro ao remover telefone.");
    }
  }

  async function setPrimary(ph) {
    try {
      await api.post(
        `/company/customers/${phoneCustomer.id}/phones`,
        {
          phone_nsn: ph.phone_nsn,
          label: (ph.label || "").slice(0, 40) || null,
          type: (ph.type || "").slice(0, 20) || null,
          contact_name: (ph.contact_name || "").slice(0, 120) || null,
          is_primary: true
        },
        withAuth({ params: { company_id: companyId } })
      );
      await refreshPhonesAfterChange();
    } catch (e) {
      console.error(e);
      const detail = e?.response?.data?.detail;
      alert(detail ? String(detail) : "Erro ao definir telefone principal.");
    }
  }

  // ======= Helpers Pesquisa (novos) =======
  const needsOptions = (t) => t === "single" || t === "multi" || t === "yes_no";
  const ensureYesNo = (arr) => (arr && arr.length ? arr : ["Sim","Não"]);
  function parseOptionsToFields(opt) {
    if (!opt) return [];
    if (Array.isArray(opt)) return opt.map(v => String(v ?? "")).filter(s => s !== "");
    if (typeof opt === "string") {
      try {
        const arr = JSON.parse(opt);
        return Array.isArray(arr) ? arr.map(v => String(v ?? "")).filter(Boolean) : [];
      } catch { return []; }
    }
    if (typeof opt === "object") {
      // fallback: tenta extrair valores
      const vals = Object.values(opt);
      return vals.map(v => String(v ?? "")).filter(Boolean);
    }
    return [];
  }
  function setSurveyEditPatch(id, patch) {
    setSurveyEdit(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }

  // ===== Pesquisa: chamadas =====
  async function loadSurveyData(customerId) {
    if (!customerId) return;
    try {
      setSurveyLoading(true);
      setSurveyErr(""); setSurveyMsg("");
      const formResp = await api.get(`/company/customers/${customerId}/survey/form`, withAuth({
        params: { company_id: companyId }
      }));
      if (formResp?.data?.exists) {
        setSurveyForm(formResp.data);
        const qResp = await api.get(`/company/customers/${customerId}/survey/questions`, withAuth({
          params: { company_id: companyId }
        }));
        const arr = Array.isArray(qResp?.data?.items) ? qResp.data.items : [];
        setSurveyQuestions(arr);
      } else {
        setSurveyForm(null);
        setSurveyQuestions([]);
      }
    } catch (e) {
      console.error(e);
      setSurveyErr("Falha ao carregar pesquisa.");
    } finally {
      setSurveyLoading(false);
    }
  }

  // Sincroniza surveyEdit ao carregar/perguntas mudarem
  useEffect(() => {
    const init = {};
    (surveyQuestions || []).forEach(q => {
      init[q.id] = {
        ...q,
        optionsFields: parseOptionsToFields(q.options)
      };
    });
    setSurveyEdit(init);
  }, [surveyQuestions]);

  async function createSurveyForm() {
    try {
      setSurveyErr(""); setSurveyMsg("");
      const resp = await api.post(
        `/company/customers/${editing.id}/survey/form`,
        { title: "Pesquisa de Satisfação", created_by: user?.id || null },
        withAuth({ params: { company_id: companyId } })
      );
      setSurveyMsg(resp?.data?.message || "Formulário criado!");
      await loadSurveyData(editing.id);
    } catch (e) {
      console.error(e);
      setSurveyErr(e?.response?.data?.detail || "Erro ao criar formulário.");
    }
  }

  async function addSurveyQuestion(e) {
    e?.preventDefault?.();
    try {
      setSurveyErr(""); setSurveyMsg("");
      let optionsArr = null;
      if (needsOptions(newQuestion.q_type)) {
        const list = (newQuestion.optionsFields || []).map(s => String(s).trim()).filter(Boolean);
        optionsArr = newQuestion.q_type === "yes_no" ? ensureYesNo(list) : (list.length ? list : null);
      }
      const payload = {
        prompt: newQuestion.prompt,
        q_type: newQuestion.q_type,
        required: !!newQuestion.required,
        options: optionsArr,
        min_value: newQuestion.q_type === "scale" ? Number(newQuestion.min_value) : null,
        max_value: newQuestion.q_type === "scale" ? Number(newQuestion.max_value) : null,
        order_index: Number(newQuestion.order_index || 0),
      };
      const resp = await api.post(
        `/company/customers/${editing.id}/survey/questions`,
        payload,
        withAuth({ params: { company_id: companyId } })
      );
      setSurveyMsg(resp?.data?.message || "Pergunta adicionada!");
      setNewQuestion({
        prompt: "",
        q_type: "single",
        required: true,
        optionsFields: [],
        min_value: 0,
        max_value: 10,
        order_index: (surveyQuestions.length || 0) + 1
      });
      await loadSurveyData(editing.id);
    } catch (e) {
      console.error(e);
      setSurveyErr(e?.response?.data?.detail || "Erro ao adicionar pergunta.");
    }
  }

  async function saveQuestionInline(qLocal) {
    try {
      setSurveyErr(""); setSurveyMsg("");
      let optionsArr = null;
      if (needsOptions(qLocal.q_type)) {
        const list = (qLocal.optionsFields || []).map(s => String(s).trim()).filter(Boolean);
        optionsArr = qLocal.q_type === "yes_no" ? ensureYesNo(list) : (list.length ? list : null);
      }
      const payload = {
        prompt: qLocal.prompt,
        q_type: qLocal.q_type,
        required: !!qLocal.required,
        order_index: Number(qLocal.order_index || 0),
        min_value: qLocal.q_type === "scale" ? Number(qLocal.min_value) : null,
        max_value: qLocal.q_type === "scale" ? Number(qLocal.max_value) : null,
        options: optionsArr
      };
      const resp = await api.put(
        `/company/customers/${editing.id}/survey/questions/${qLocal.id}`,
        payload,
        withAuth({ params: { company_id: companyId } })
      );
      setSurveyMsg(resp?.data?.message || "Pergunta atualizada!");
      await loadSurveyData(editing.id);
    } catch (e) {
      console.error(e);
      setSurveyErr(e?.response?.data?.detail || "Erro ao atualizar pergunta.");
    }
  }

  async function removeQuestion(qid) {
    if (!window.confirm("Remover esta pergunta?")) return;
    try {
      setSurveyErr(""); setSurveyMsg("");
      const resp = await api.delete(
        `/company/customers/${editing.id}/survey/questions/${qid}`,
        withAuth({ params: { company_id: companyId } })
      );
      setSurveyMsg(resp?.data?.message || "Pergunta removida!");
      await loadSurveyData(editing.id);
    } catch (e) {
      console.error(e);
      setSurveyErr(e?.response?.data?.detail || "Erro ao remover pergunta.");
    }
  }

  const errMsg = (k) => formErrors[k];

  const tabs = useMemo(() => {
    const base = [
      { key: "perfil", label: "Perfil" },
      { key: "contato", label: "Contato" },
      { key: "endereco", label: "Endereço" },
    ];
    if (editing?.id) {
      base.push({ key: "documentos", label: "Documentos" });
      base.push({ key: "pesquisa", label: "Pesquisa" });
    }
    return base;
  }, [editing]);

  return (
    <div className="p-6" style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,.50))"}}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cadastro de Clientes</h1>
        <button onClick={openCreate} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          + Novo cliente
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por razão social, nome fantasia, telefone ou e-mail…"
          className="w-[40%] px-3 py-2 border rounded-lg bg-white"
        />
        <button onClick={() => fetchList(1, q)} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
          Buscar
        </button>
      </div>

      <div className="mt-2 bg-white overflow-x-auto border border-gray-400 rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,.20))"}}>
            <thead className="bg-primary text-white font-bold">
              <tr>
                <th className="text-left px-4 py-3">Nome Fantasia</th>
                <th className="text-left px-4 py-3">Razão Social</th>
                <th className="text-left px-4 py-3">Telefones</th>
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">CPF/CNPJ</th>
                <th className="text-left px-4 py-3">Criado em</th>
                <th className="text-center px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={7}>Carregando…</td></tr>
              ) : list.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={7}>Nenhum cliente encontrado.</td></tr>
              ) : (
                list.map((c) => {
                  const fantasy = c.trade_name || "-";
                  const corporate = c.customer || "-";
                  const createdAt = c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : "";
                  const phonesArr = c.phones || [];
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3">{fantasy}</td>
                      <td className="px-4 py-3">{corporate}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {phonesArr.length
                            ? phonesArr.map((p) => (
                                <span
                                  key={p.id || `${c.id}-${p.phone_nsn}`}
                                  className={classNames(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border",
                                    p.is_primary ? "border-indigo-600 text-indigo-700" : "border-gray-300 text-gray-700"
                                  )}
                                  title={[p.label, p.type, p.contact_name].filter(Boolean).join(" • ")}
                                >
                                  {formatBrPhone(p.phone_nsn)}
                                  {p.is_primary && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.176 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                                    </svg>
                                  )}
                                </span>
                              ))
                            : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">{c.mail || "-"}</td>
                      <td className="px-4 py-3">{c.cpf_cnpj || "-"}</td>
                      <td className="px-4 py-3">{createdAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openPhonesModal(c)} className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50">
                            Telefones
                          </button>
                          <button onClick={() => openEdit(c)} className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50">
                            Editar
                          </button>
                          <button onClick={() => openDocs(c)} className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50">
                            Documentos
                          </button>
                          <button onClick={() => openSurvey(c)} className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50">
                            Pesquisa de Satisfação
                          </button>
                          <button onClick={() => removeCustomer(c)} className="px-3 py-1 rounded-lg border bg-white text-red-600 hover:bg-red-50 hover:border-red-300">
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-gray-600">{total} registro{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchList(p, q); }}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50 bg-white hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700">Página {page} de {totalPages}</span>
            <button
              onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchList(p, q); }}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50 bg-white hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <Modal open={openForm} onClose={() => setOpenForm(false)} maxWidth="max-w-5xl">
        <div className="p-5">
          <h2 className="text-lg font-semibold mb-4">
            {editing
              ? (formTab === "documentos" ? "Documentos do cliente"
                : formTab === "pesquisa" ? "Pesquisa de Satisfação"
                : "Editar cliente")
              : "Novo cliente"}
          </h2>

          <div className="mb-4 flex gap-2 border-b">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setFormTab(t.key);
                  if (t.key === "pesquisa" && editing?.id) loadSurveyData(editing.id);
                }}
                className={classNames(
                  "px-4 py-2 -mb-[1px] border-b-2 font-semibold",
                  formTab === t.key ? "border-primary text-primary" : "border-transparent text-gray-500"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {formTab === "documentos" && editing?.id ? (
            <>
              <UploadCustomerDocs
                customerId={editing.id}
                customerName={editing.trade_name || editing.customer}
                onUploaded={() => fetchList(page, q)}
              />
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setOpenForm(false)} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">
                  Fechar
                </button>
              </div>
            </>
          ) : formTab === "pesquisa" && editing?.id ? (
            <>
              {surveyLoading ? (
                <div className="text-gray-600">Carregando…</div>
              ) : (
                <div className="space-y-4">
                  {surveyMsg && <div className="p-2 bg-green-100 text-green-700 rounded">{surveyMsg}</div>}
                  {surveyErr && <div className="p-2 bg-red-100 text-red-700 rounded">{surveyErr}</div>}

                  {!surveyForm ? (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <p className="mb-3">Nenhuma pesquisa encontrada para este cliente.</p>
                      <button onClick={createSurveyForm} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                        Criar formulário de Pesquisa
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">Pesquisa de Satisfação</h3>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3">Perguntas</h4>
                        {surveyQuestions.length === 0 ? (
                          <div className="text-gray-500">Nenhuma pergunta cadastrada.</div>
                        ) : (
                          <div className="space-y-3">
                            {surveyQuestions.map((qItem) => {
                              const local = surveyEdit[qItem.id] || {};
                              const setLocal = (patch) => setSurveyEditPatch(qItem.id, patch);
                              const addField = () => setLocal({ optionsFields: [...(local.optionsFields || []), ""] });
                              const setField = (idx, val) => {
                                const arr = [...(local.optionsFields || [])];
                                arr[idx] = val;
                                setLocal({ optionsFields: arr });
                              };
                              const removeField = (idx) => {
                                const arr = [...(local.optionsFields || [])];
                                arr.splice(idx, 1);
                                setLocal({ optionsFields: arr });
                              };
                              const useYesNo = () => setLocal({ optionsFields: ["Sim","Não"] });

                              return (
                                <div key={qItem.id} className="border rounded p-3">
                                  <div className="grid md:grid-cols-6 gap-2 items-start">
                                    <div className="md:col-span-3">
                                      <label className="text-xs text-gray-600">Pergunta</label>
                                      <input
                                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                                        value={local.prompt || ""}
                                        onChange={(e) => setLocal({ ...local, prompt: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600">Tipo</label>
                                      <select
                                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                                        value={local.q_type || "single"}
                                        onChange={(e) => {
                                          const qt = e.target.value;
                                          setLocal({ ...local, q_type: qt });
                                          if (!needsOptions(qt)) setLocal({ ...local, q_type: qt, optionsFields: [] });
                                        }}
                                      >
                                        <option value="single">Múltipla (uma opção)</option>
                                        <option value="multi">Múltipla (várias)</option>
                                        <option value="scale">Escala</option>
                                        <option value="text">Texto</option>
                                        <option value="yes_no">Sim/Não</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600">Obrigatória</label>
                                      <select
                                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                                        value={(local.required ? "1" : "0")}
                                        onChange={(e) => setLocal({ ...local, required: e.target.value === "1" })}
                                      >
                                        <option value="1">Sim</option>
                                        <option value="0">Não</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-600">Ordem</label>
                                      <input
                                        type="number"
                                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                                        value={local.order_index ?? 0}
                                        onChange={(e) => setLocal({ ...local, order_index: Number(e.target.value || 0) })}
                                      />
                                    </div>

                                    {(local.q_type === "scale") && (
                                      <>
                                        <div>
                                          <label className="text-xs text-gray-600">Mín</label>
                                          <input
                                            type="number"
                                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                                            value={local.min_value ?? 0}
                                            onChange={(e) => setLocal({ ...local, min_value: Number(e.target.value || 0) })}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600">Máx</label>
                                          <input
                                            type="number"
                                            className="mt-1 w-full px-3 py-2 border rounded-lg"
                                            value={local.max_value ?? 10}
                                            onChange={(e) => setLocal({ ...local, max_value: Number(e.target.value || 10) })}
                                          />
                                        </div>
                                      </>
                                    )}

                                    {needsOptions(local.q_type) && (
                                      <div className="md:col-span-6">
                                        <label className="text-xs text-gray-600">Campos da Pergunta</label>
                                        {(local.optionsFields || []).map((opt, idx) => (
                                          <div key={idx} className="flex gap-2 mt-1">
                                            <input
                                              className="flex-1 px-3 py-2 border rounded-lg"
                                              placeholder={`Opção ${idx + 1}`}
                                              value={opt}
                                              onChange={(e) => setField(idx, e.target.value)}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeField(idx)}
                                              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                                              title="Remover opção"
                                            >
                                              –
                                            </button>
                                          </div>
                                        ))}
                                        <div className="flex items-center gap-2 mt-2">
                                          <button
                                            type="button"
                                            onClick={addField}
                                            className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                                          >
                                            + Adicionar campo
                                          </button>
                                          {local.q_type === "yes_no" && (
                                            <button
                                              type="button"
                                              onClick={useYesNo}
                                              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                                            >
                                              Usar Outras Condições 
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex justify-end gap-2 mt-3">
                                    <button
                                      onClick={() => saveQuestionInline(local)}
                                      className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      onClick={() => removeQuestion(qItem.id)}
                                      className="px-3 py-1.5 rounded-lg border bg-white text-red-600 hover:bg-red-50 hover:border-red-300"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="h-px bg-gray-200 my-4" />

                        <h4 className="font-semibold mb-2">Adicionar pergunta</h4>
                        <form onSubmit={addSurveyQuestion} className="grid md:grid-cols-6 gap-2 items-start bg-gray-50 p-3 rounded-lg border">
                          <div className="md:col-span-3">
                            <label className="text-xs text-gray-600">Pergunta</label>
                            <input
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                              value={newQuestion.prompt}
                              onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Tipo</label>
                            <select
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                              value={newQuestion.q_type}
                              onChange={(e) => {
                                const qt = e.target.value;
                                setNewQuestion(n => ({ ...n, q_type: qt, optionsFields: needsOptions(qt) ? n.optionsFields : [] }));
                              }}
                            >
                              <option value="single">Múltipla (uma opção)</option>
                              <option value="multi">Múltipla (várias)</option>
                              <option value="scale">Escala</option>
                              <option value="text">Texto</option>
                              <option value="yes_no">Sim/Não</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Obrigatória</label>
                            <select
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                              value={newQuestion.required ? "1" : "0"}
                              onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.value === "1" })}
                            >
                              <option value="1">Sim</option>
                              <option value="0">Não</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Ordem</label>
                            <input
                              type="number"
                              className="mt-1 w-full px-3 py-2 border rounded-lg"
                              value={newQuestion.order_index}
                              onChange={(e) => setNewQuestion({ ...newQuestion, order_index: Number(e.target.value || 0) })}
                            />
                          </div>

                          {newQuestion.q_type === "scale" && (
                            <>
                              <div>
                                <label className="text-xs text-gray-600">Mín</label>
                                <input
                                  type="number"
                                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                                  value={newQuestion.min_value}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, min_value: Number(e.target.value || 0) })}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">Máx</label>
                                <input
                                  type="number"
                                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                                  value={newQuestion.max_value}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, max_value: Number(e.target.value || 10) })}
                                />
                              </div>
                            </>
                          )}

                          {needsOptions(newQuestion.q_type) && (
                            <div className="md:col-span-6">
                              <label className="text-xs text-gray-600">Campos da Pergunta</label>
                              {(newQuestion.optionsFields || []).map((opt, idx) => (
                                <div key={idx} className="flex gap-2 mt-1">
                                  <input
                                    className="flex-1 px-3 py-2 border rounded-lg"
                                    placeholder={`Opção ${idx + 1}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const arr = [...newQuestion.optionsFields];
                                      arr[idx] = e.target.value;
                                      setNewQuestion({ ...newQuestion, optionsFields: arr });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const arr = [...newQuestion.optionsFields];
                                      arr.splice(idx, 1);
                                      setNewQuestion({ ...newQuestion, optionsFields: arr });
                                    }}
                                    className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                                    title="Remover opção"
                                  >
                                    –
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setNewQuestion(n => ({ ...n, optionsFields: [...(n.optionsFields || []), ""] }))}
                                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                                >
                                  + Adicionar campo
                                </button>
                                {newQuestion.q_type === "yes_no" && (
                                  <button
                                    type="button"
                                    onClick={() => setNewQuestion(n => ({ ...n, optionsFields: ["Sim","Não"] }))}
                                    className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                                  >
                                    Usar “Sim/Não”
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="md:col-span-6 flex justify-end">
                            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                              Adicionar
                            </button>
                          </div>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setOpenForm(false)} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">
                  Fechar
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submitForm}>
              {formTab === "perfil" && (
                <>
                  <h3 className="font-semibold text-primary mb-2">Perfil do Cliente</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600">Razão Social *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("customer") && "border-red-500")}
                        value={form.customer}
                        maxLength={255}
                        onChange={(e) => setFormPatch({ customer: e.target.value.slice(0,255) })}
                      />
                      {errMsg("customer") && <p className="text-xs text-red-600 mt-1">{errMsg("customer")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Nome Fantasia *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("trade_name") && "border-red-500")}
                        value={form.trade_name}
                        maxLength={255}
                        onChange={(e) => setFormPatch({ trade_name: e.target.value.slice(0,255) })}
                      />
                      {errMsg("trade_name") && <p className="text-xs text-red-600 mt-1">{errMsg("trade_name")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Segmento *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("segment") && "border-red-500")}
                        value={form.segment}
                        maxLength={120}
                        onChange={(e) => setFormPatch({ segment: e.target.value.slice(0,120) })}
                      />
                      {errMsg("segment") && <p className="text-xs text-red-600 mt-1">{errMsg("segment")}</p>}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600">Modelo do cliente *</label>
                      <select
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("person_type") && "border-red-500")}
                        value={form.person_type}
                        onChange={(e) => setFormPatch({ person_type: (e.target.value || "PJ").slice(0,2) })}
                      >
                        <option value="PJ">PJ (Empresa)</option>
                        <option value="PF">PF (Pessoa Física)</option>
                      </select>
                      {errMsg("person_type") && <p className="text-xs text-red-600 mt-1">{errMsg("person_type")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">{form.person_type === "PF" ? "CPF *" : "CNPJ *"}</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("cpf_cnpj") && "border-red-500")}
                        value={form.cpf_cnpj}
                        maxLength={20}
                        onChange={(e) => setFormPatch({ cpf_cnpj: onlyDigits(e.target.value).slice(0,20) })}
                        placeholder="Somente números"
                      />
                      {errMsg("cpf_cnpj") && <p className="text-xs text-red-600 mt-1">{errMsg("cpf_cnpj")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Representante *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("representative_name") && "border-red-500")}
                        value={form.representative_name}
                        maxLength={255}
                        onChange={(e) => setFormPatch({ representative_name: e.target.value.slice(0,255) })}
                      />
                      {errMsg("representative_name") && <p className="text-xs text-red-600 mt-1">{errMsg("representative_name")}</p>}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-sm text-gray-600">Descrição da empresa *</label>
                    <textarea
                      className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("description") && "border-red-500")}
                      rows={6}
                      value={form.description}
                      onChange={(e) => setFormPatch({ description: e.target.value })}
                    />
                    {errMsg("description") && <p className="text-xs text-red-600 mt-1">{errMsg("description")}</p>}
                  </div>

                  <div className="mb-6">
                    <label className="text-sm text-gray-600 block mb-1">Aceita pesquisa de satisfação? *</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="accepts_feedback" checked={!!form.accepts_feedback} onChange={() => setFormPatch({ accepts_feedback: true })} />
                        Sim
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name="accepts_feedback" checked={!form.accepts_feedback} onChange={() => setFormPatch({ accepts_feedback: false })} />
                        Não
                      </label>
                    </div>
                    {errMsg("accepts_feedback") && <p className="text-xs text-red-600 mt-1">{errMsg("accepts_feedback")}</p>}
                  </div>

                  <div className="mb-2">
                    <label className="text-sm text-gray-600">Observações</label>
                    <textarea
                      className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("notes") && "border-red-500")}
                      rows={3}
                      value={form.notes}
                      maxLength={255}
                      onChange={(e) => setFormPatch({ notes: e.target.value.slice(0,255) })}
                    />
                    {errMsg("notes") && <p className="text-xs text-red-600 mt-1">{errMsg("notes")}</p>}
                  </div>
                </>
              )}

              {formTab === "contato" && (
                <>
                  <h3 className="font-semibold text-primary mb-2">Contato do Cliente</h3>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    {[0,1,2].map((i) => (
                      <div key={i}>
                        <label className="text-sm text-gray-600">
                          {i===0 ? "Telefone principal *" : `Telefone adicional ${i} (opcional)`}
                        </label>
                        <div className="mt-1 grid grid-cols-3 gap-2">
                          <input
                            className={classNames("px-2 py-2 border rounded-lg", i===0 && errMsg("phone0") && "border-red-500")}
                            placeholder="DDD"
                            value={form.phonesUI[i].ddd}
                            maxLength={2}
                            onChange={(e) => setPhoneUI(i, { ddd: onlyDigits(e.target.value).slice(0,2) })}
                            disabled={!!editing}
                          />
                          <input
                            className={classNames("px-2 py-2 border rounded-lg col-span-2", i===0 && errMsg("phone0") && "border-red-500")}
                            placeholder="Número"
                            value={form.phonesUI[i].number}
                            maxLength={9}
                            onChange={(e) => setPhoneUI(i, { number: onlyDigits(e.target.value).slice(0,9) })}
                            disabled={!!editing}
                          />
                        </div>
                        {i===0 && errMsg("phone0") && <p className="text-xs text-red-600 mt-1">{errMsg("phone0")}</p>}
                        <div className="mt-2 flex gap-2">
                          <select
                            className="px-2 py-2 border rounded-lg"
                            value={form.phonesUI[i].type}
                            onChange={(e) => setPhoneUI(i, { type: (e.target.value || "mobile").slice(0,20) })}
                            disabled={!!editing}
                          >
                            <option value="mobile">Celular</option>
                            <option value="commercial">Comercial</option>
                            <option value="other">Outro</option>
                          </select>
                          <input
                            className="flex-1 px-2 py-2 border rounded-lg"
                            placeholder="Nome do contato"
                            value={form.phonesUI[i].contact_name}
                            maxLength={120}
                            onChange={(e) => setPhoneUI(i, { contact_name: e.target.value.slice(0,120) })}
                            disabled={!!editing}
                          />
                        </div>
                        {i===0 && editing && (
                          <div className="text-xs text-gray-500 mt-1">Para alterar telefones, use o botão “Telefones” na lista.</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600">E-mail principal *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("mail") && "border-red-500")}
                        type="email"
                        value={form.mail}
                        maxLength={255}
                        onChange={(e) => setFormPatch({ mail: e.target.value.slice(0,255) })}
                      />
                      {errMsg("mail") && <p className="text-xs text-red-600 mt-1">{errMsg("mail")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">E-mail adicional 1</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("mail_alt1") && "border-red-500")}
                        type="email"
                        value={form.mail_alt1}
                        maxLength={255}
                        onChange={(e) => setFormPatch({ mail_alt1: e.target.value.slice(0,255) })}
                      />
                      {errMsg("mail_alt1") && <p className="text-xs text-red-600 mt-1">{errMsg("mail_alt1")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">E-mail adicional 2</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("mail_alt2") && "border-red-500")}
                        type="email"
                        value={form.mail_alt2}
                        maxLength={255}
                        onChange={(e) => setFormPatch({ mail_alt2: e.target.value.slice(0,255) })}
                      />
                      {errMsg("mail_alt2") && <p className="text-xs text-red-600 mt-1">{errMsg("mail_alt2")}</p>}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Website</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("website_url") && "border-red-500")}
                        value={form.website_url}
                        maxLength={255}
                        onChange={(e) => setFormPatch({ website_url: e.target.value.slice(0,255) })}
                        placeholder="https://..."
                      />
                      {errMsg("website_url") && <p className="text-xs text-red-600 mt-1">{errMsg("website_url")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Rede social (tipo)</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("social_type") && "border-red-500")}
                        value={form.social_type}
                        maxLength={20}
                        onChange={(e) => setFormPatch({ social_type: e.target.value.slice(0,20) })}
                        placeholder="Instagram"
                      />
                      {errMsg("social_type") && <p className="text-xs text-red-600 mt-1">{errMsg("social_type")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Usuário / @handle</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("social_handle") && "border-red-500")}
                        value={form.social_handle}
                        maxLength={120}
                        onChange={(e) => setFormPatch({ social_handle: e.target.value.slice(0,120) })}
                        placeholder="@minhaempresa"
                      />
                      {errMsg("social_handle") && <p className="text-xs text-red-600 mt-1">{errMsg("social_handle")}</p>}
                    </div>
                  </div>
                </>
              )}

              {formTab === "endereco" && (
                <>
                  <h3 className="font-semibold text-primary mb-2">Endereço do Cliente</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-600">Logradouro *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("street") && "border-red-500")}
                        value={form.address.street}
                        maxLength={255}
                        onChange={(e) => setFormAddrPatch({ street: e.target.value.slice(0,255) })}
                      />
                      {errMsg("street") && <p className="text-xs text-red-600 mt-1">{errMsg("street")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Número *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("number") && "border-red-500")}
                        value={form.address.number}
                        maxLength={20}
                        onChange={(e) => setFormAddrPatch({ number: e.target.value.slice(0,20) })}
                      />
                      {errMsg("number") && <p className="text-xs text-red-600 mt-1">{errMsg("number")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Complemento</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("complement") && "border-red-500")}
                        value={form.address.complement}
                        maxLength={100}
                        onChange={(e) => setFormAddrPatch({ complement: e.target.value.slice(0,100) })}
                      />
                      {errMsg("complement") && <p className="text-xs text-red-600 mt-1">{errMsg("complement")}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">CEP *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("zipcode") && "border-red-500")}
                        value={form.address.zipcode}
                        maxLength={8}
                        onChange={(e) => setFormAddrPatch({ zipcode: onlyDigits(e.target.value).slice(0,8) })}
                        placeholder="Somente números"
                      />
                      {errMsg("zipcode") && <p className="text-xs text-red-600 mt-1">{errMsg("zipcode")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Cidade *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("city") && "border-red-500")}
                        value={form.address.city}
                        maxLength={120}
                        onChange={(e) => setFormAddrPatch({ city: e.target.value.slice(0,120) })}
                      />
                      {errMsg("city") && <p className="text-xs text-red-600 mt-1">{errMsg("city")}</p>}
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Estado (UF) *</label>
                      <input
                        className={classNames("mt-1 w-full px-3 py-2 border rounded-lg", errMsg("state") && "border-red-500")}
                        value={form.address.state}
                        maxLength={2}
                        onChange={(e) => setFormAddrPatch({ state: e.target.value.toUpperCase().slice(0,2) })}
                        placeholder="UF"
                      />
                      {errMsg("state") && <p className="text-xs text-red-600 mt-1">{errMsg("state")}</p>}
                    </div>
                  </div>
              </>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setOpenForm(false)} className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  Salvar
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      <Modal open={openPhones} onClose={() => setOpenPhones(false)} maxWidth="max-w-2xl">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Telefones — {phoneCustomer?.trade_name || phoneCustomer?.customer}</h2>
            <button onClick={() => setOpenPhones(false)} className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50">
              Fechar
            </button>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {phones.length ? (
                phones.map((ph) => (
                  <div key={ph.id} className={classNames("flex items-center gap-2 px-3 py-1.5 rounded-lg border", ph.is_primary ? "border-indigo-600" : "border-gray-300")}>
                    <div className="font-medium">{formatBrPhone(ph.phone_nsn)}</div>
                    <div className="text-gray-500 text-sm">
                      {ph.type === "mobile" ? "[celular]"
                      : ph.type === "commercial" ? "[comercial]"
                      : "[outro]"}
                    </div>
                    {ph.contact_name && <div className="text-gray-500 text-sm">({ph.contact_name})</div>}
                    {ph.is_primary && <span className="text-indigo-700 text-xs">principal</span>}
                    <div className="flex items-center gap-1 ml-2">
                      {!ph.is_primary && (
                        <button onClick={() => setPrimary(ph)} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
                          Definir principal
                        </button>
                      )}
                      <button onClick={() => removePhone(ph)} className="text-xs px-2 py-1 rounded border bg-white text-red-600 hover:bg-red-50 hover:border-red-300">
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">Nenhum telefone cadastrado.</div>
              )}
            </div>
          </div>

          <h3 className="font-semibold text-primary mb-2">Adicionar novo telefone</h3>
          <form onSubmit={addPhone} className="grid md:grid-cols-3 gap-3 items-end bg-gray-50 p-3 rounded-lg border">
            <div>
              <label className="text-sm text-gray-600">DDD</label><br/>
              <input
                className="mt-1 w-[80%] px-3 py-2 border rounded-lg"
                value={newPhone.ddd}
                maxLength={2}
                onChange={(e) => setNewPhone(p => ({ ...p, ddd: onlyDigits(e.target.value).slice(0,2) }))}
                placeholder="11"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Número</label><br/>
              <input
                className="mt-1 w-full px-3 py-2 border rounded-lg"
                value={newPhone.number}
                maxLength={9}
                onChange={(e) => setNewPhone(p => ({ ...p, number: onlyDigits(e.target.value).slice(0,9) }))}
                placeholder="912345678"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Tipo</label><br/>
              <select
                className="mt-1 w-[80%] px-3 py-2 border rounded-lg"
                value={newPhone.type}
                onChange={(e) => setNewPhone(p => ({ ...p, type: (e.target.value || "mobile").slice(0,20) }))}
              >
                <option value="mobile">Celular</option>
                <option value="commercial">Comercial</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Contato</label>
              <input
                className="mt-1 w-full px-3 py-2 border rounded-lg"
                value={newPhone.contact_name}
                maxLength={120}
                onChange={(e) => setNewPhone(p => ({ ...p, contact_name: e.target.value.slice(0,120) }))}
                placeholder="Nome do contato"
              />
            </div>
            <div className="flex items-center ml-1 mt-6 gap-3 md:col-span-2">
              <label className="flex text-middle gap-2">
                <input type="checkbox" checked={newPhone.is_primary} onChange={(e) => setNewPhone(p => ({ ...p, is_primary: e.target.checked }))} />
                Definir como Telefone Principal
              </label>
            </div>

            <div className="md:col-span-3">
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
