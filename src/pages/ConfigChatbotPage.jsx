import React, { useEffect, useState, useMemo } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import FaqByRole from "../components/FaqByRole";
import AutoTextarea from "../utils/AutoTextarea";

function AttendantRoleRouter({ attendants = [], roles = [], mapping = {}, onChange }) {
  const byId = useMemo(() => {
    const m = {}; attendants.forEach(a => m[a.id] = a); return m;
  }, [attendants]);

  const handleSelect = (role, employeeIdStr) => {
    const employee_id = employeeIdStr ? Number(employeeIdStr) : null;
    const next = { ...mapping, [role]: employee_id };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {roles.length === 0 && (
        <div className="text-sm text-gray-500">
          Nenhum cargo encontrado em seus colaboradores ativos.
        </div>
      )}

      {roles.map((role) => (
        <div key={role} className="flex items-center gap-3">
          <div className="w-48 font-semibold text-primary">{role}</div>
          <select
            className="input max-w-[360px]"
            value={mapping[role] || ""}
            onChange={(e) => handleSelect(role, e.target.value)}
          >
            <option value="">— Selecione um atendente —</option>
            {attendants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome || a.username || a.email || `ID ${a.id}`}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function sanitizeFaqClient(faqs) {
  return (faqs || [])
    .map(f => ({ q: (f.q || "").trim(), a: (f.a || "").trim() }))
    .filter(f => f.q && f.a);
}

function sanitizeFaqByRole(list) {
  return (list || [])
    .filter(b => b.role_id)
    .map(b => ({
      role_id: Number(b.role_id),
      qa: (b.qa || [])
        .map(x => ({ q: (x.q || "").trim(), a: (x.a || "").trim() }))
        .filter(x => x.q && x.a)
    }))
    .filter(b => b.qa.length > 0);
}

/* ============ Página principal ============ */
export default function ConfigChatbotPage() {
  const [tab, setTab] = useState("clientes");
  const isEmployee = tab === "colaboradores";
  const [faqByRole, setFaqByRole] = useState([]);

  // Campos CLIENTES (existentes)
  const [nomeBot, setNomeBot] = useState("");
  const [tomVoz, setTomVoz] = useState("");
  const [mensagemBoasVindas, setMensagemBoasVindas] = useState("");
  const [emoji, setEmoji] = useState("");
  const [permiteArquivo, setPermiteArquivo] = useState(false);
  const [permiteAudio, setPermiteAudio] = useState(false);
  const [permitePagamento, setPermitePagamento] = useState(false);

  const [segmento, setSegmento] = useState("");
  const [diferenciais, setDiferenciais] = useState([""]);
  const [missao, setMissao] = useState("");
  const [persona, setPersona] = useState("");
  const [produtos, setProdutos] = useState([""]);
  const [customFields, setCustomFields] = useState([{ label: "", value: "" }]);
  const [faqs, setFaqs] = useState([{ q: "", a: "" }]);

  const [employeeRouting, setEmployeeRouting] = useState({});
  const [employees, setEmployees] = useState([]);
  const [rolesForFaq, setRolesForFaq] = useState([]);

  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const COMPANY_ID = user ? user.company_id : null;
  const API_URL = import.meta.env.VITE_API_URL;

  function handleAddCustomField() {
    if (customFields.length < 10)
      setCustomFields([...customFields, { label: "", value: "" }]);
  }

  useEffect(() => {
    if (!COMPANY_ID) return;
    const url = `${API_URL}/chatbot/config?company_id=${COMPANY_ID}&is_employee_faq=${isEmployee}`;
    authFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar configurações.");
        return res.json();
      })
      .then((data) => {
        if (!isEmployee) {
          setNomeBot(data.nome_bot || "");
          setTomVoz(data.tom_voz || "");
          setMensagemBoasVindas(data.mensagem_boas_vindas || "");
          setEmoji(data.emoji || "");
          setPermiteArquivo(!!data.permite_arquivo);
          setPermiteAudio(!!data.permite_audio);
          setPermitePagamento(!!data.permite_pagamento);
          setSegmento(data.segmento || "");
          setDiferenciais(data.diferenciais && data.diferenciais.length > 0 ? data.diferenciais : [""]);
          setMissao(data.missao || "");
          setPersona(data.persona || "");
          setProdutos(data.produtos && data.produtos.length > 0 ? data.produtos : [""]);
          setFaqs(Array.isArray(data.faqs_client) && data.faqs_client.length ? data.faqs_client : [{ q: "", a: "" }]);
          setCustomFields(data.extra_fields && data.extra_fields.length > 0 ? data.extra_fields : [{ label: "", value: "" }]);
        } else {
          setFaqByRole(Array.isArray(data.faqs_employee_by_role) ? data.faqs_employee_by_role : []);
          setEmployeeRouting(data.employee_routing || {});
        }
      })
      .catch((err) => console.log("Erro ao buscar configs:", err));
  }, [COMPANY_ID, isEmployee, API_URL]);

  useEffect(() => {
    if (!COMPANY_ID || !isEmployee) return;
    authFetch(`${API_URL}/company/employees?company_id=${COMPANY_ID}`)
      .then((res) => res.json())
      .then((list) => setEmployees(Array.isArray(list) ? list : []))
      .catch(() => setEmployees([]));
  }, [COMPANY_ID, isEmployee, API_URL]);

  useEffect(() => {
    if (!COMPANY_ID || !isEmployee) return;
    authFetch(`${API_URL}/company/roles?company_id=${COMPANY_ID}`)
      .then(res => res.json())
      .then(data => setRolesForFaq(Array.isArray(data.roles) ? data.roles : []))
      .catch(() => setRolesForFaq([]));
  }, [COMPANY_ID, isEmployee, API_URL]);

  const rolesFromEmployees = useMemo(() => {
    const set = new Set();
    (employees || []).forEach(e => { if (e?.role) set.add(e.role); });
    return Array.from(set);
  }, [employees]);

  const attendants = useMemo(() => {
    return (employees || []).filter((e) => e?.status);
  }, [employees]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    const url = `${API_URL}/chatbot/config?company_id=${COMPANY_ID}&is_employee_faq=${isEmployee}`;

    const payload = !isEmployee
      ? {
          nome_bot: nomeBot,
          tom_voz: tomVoz,
          mensagem_boas_vindas: mensagemBoasVindas,
          emoji,
          permite_arquivo: permiteArquivo,
          permite_audio: permiteAudio,
          permite_pagamento: permitePagamento,
          segmento,
          diferenciais: (diferenciais || []).map(d => d.trim()).filter(Boolean),
          missao,
          persona,
          produtos: (produtos || []).map(p => p.trim()).filter(Boolean),
          extra_fields: (customFields || []).filter(c => c.label?.trim() && c.value?.trim() ),
          faqs_client: sanitizeFaqClient(faqs),
        }
      : {
          employee_routing: employeeRouting,
          faqs_employee_by_role: sanitizeFaqByRole(faqByRole),
        };

    try {
      const res = await authFetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Erro ao salvar configuração.");
      setMessage(data.message || "Configuração salva com sucesso!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      alert(err.message || "Erro ao salvar as configurações do chatbot!");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Configuração do Chatbot</h2>

      {/* Abas */}
      <div className="mb-6 flex gap-2 border-b">
        {["clientes","colaboradores"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 -mb-[1px] border-b-2 font-semibold ${
              tab === t ? "border-primary text-primary" : "border-transparent text-gray-500"
            }`}
            type="button"
          >
            {t === "clientes" ? "Clientes" : "Colaboradores"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ==== CLIENTES ==== */}
        {!isEmployee && (
          <>
            <div>
              <h3 className="font-semibold mb-2 text-primary">Personalidade do Bot</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm">Nome do Bot:</label>
                  <input
                    className="input max-w-[640px]"
                    value={nomeBot}
                    onChange={(e) => setNomeBot(e.target.value)}
                    maxLength={60}
                    placeholder="Ex: Aura Bot"
                  />
                </div>
                <div>
                  <label className="block text-sm">Tom de Voz:</label>
                  <input
                    className="input max-w-[640px]"
                    value={tomVoz}
                    onChange={(e) => setTomVoz(e.target.value)}
                    maxLength={100}
                    placeholder="Ex: Descontraído, bem-humorado, educado"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm">Mensagem Boas-vindas:</label>
                  <AutoTextarea
                    className="input min-h-[40px] max-w-[100%]"
                    value={mensagemBoasVindas}
                    onChange={(e) => setMensagemBoasVindas(e.target.value)}
                    maxLength={120}
                    placeholder="Ex: Olá! Tudo bem? Como posso te ajudar hoje? 😊"
                    minRows={2}
                    maxRows={6}
                  />
                </div>
                <div>
                  <label className="block text-sm">Emojis de preferência:</label>
                  <input
                    className="input max-w-[640px]"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    maxLength={10}
                    placeholder="Ex: 😊,🤖"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-primary">Base de instruções e conhecimentos do Chatbot</h3>
              <div className="mt-4 mb-4 px-2 py-2 bg-yellow-100 text-yellow-700 rounded shadow text-justify font-semibold w-[100%]">
                Atenção: É importante ressaltar que estas informações devem ser diretas e objetivas, evitando
                informações excessivas ou desnecessárias. <br /><br />
                Para grandes volumes, prefira .docx/.xlsx/.pdf em “Configuração de Documentos”.
              </div>
              <div className="flex gap-8 flex-wrap">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={permiteArquivo} onChange={(e) => setPermiteArquivo(e.target.checked)} />
                  Permite Envio de Arquivos
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={permiteAudio} onChange={(e) => setPermiteAudio(e.target.checked)} />
                  Permite Envio de Áudio
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={permitePagamento} onChange={(e) => setPermitePagamento(e.target.checked)} />
                  Permite Pagamento pelo Chat
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold">Objetivo e Personalidade do Bot:</label>
              <AutoTextarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="input min-h-[48px] max-w-[100%]"
                maxLength={500}
                placeholder="Ex: Atue como um vendedor, tendo como objetivo..."
                minRows={6}
                maxRows={10}
              />
            </div>

            <div>
              <label className="block font-semibold">Segmento da Empresa:</label>
              <input
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                className="input max-w-[100%]"
                maxLength={120}
                placeholder="Ex: Somos um e-commerce de moda masculina e feminina..."
              />
            </div>

            <div>
              <label className="block font-semibold">Diferenciais da Empresa:</label>
              {diferenciais.map((d, i) => (
                <div key={i} className="flex items-start gap-2 mb-3">
                  <AutoTextarea
                    value={d}
                    onChange={(e) => {
                      const arr = [...diferenciais]; arr[i] = e.target.value; setDiferenciais(arr);
                    }}
                    className="input flex-1 min-h-[36px] max-w-[680px]"
                    maxLength={300}
                    placeholder="Ex: Atendimento 24h, personalizamos conforme o gosto..."
                    minRows={2}
                    maxRows={6}
                  />
                  <div style={{ width: 36, minWidth: 36, height: 36 }}>
                    {i === diferenciais.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setDiferenciais([...diferenciais, ""])}
                        className={`text-primary font-bold w-6 h-8 mt-4 flex items-center justify-center rounded-full bg-white border border-primary hover:bg-primary hover:text-white transition ${diferenciais.length === 1 ? "animate-pulse-once" : ""}`}
                        title="Adicionar novo diferencial"
                        disabled={diferenciais.length >= 10}
                      >+</button>
                    )}
                  </div>
                </div>
              ))}
              <span className="text-xs text-gray-500">
                Se desejar clique no '<b className="text-primary">+</b>' para adicionar novos campos. (Limite de 10)
              </span>
            </div>

            <div>
              <label className="block font-semibold">Missão da Empresa:</label>
              <AutoTextarea
                value={missao}
                onChange={(e) => setMissao(e.target.value)}
                className="input min-h-[48px] max-w-[680px]"
                maxLength={300}
                placeholder="Ex: Inovar o setor, fornecer um ambiente onde o cliente..."
                minRows={4}
                maxRows={8}
              />
            </div>

            <div>
              <label className="block font-semibold">Produtos/Serviços Principais da Empresa:</label>
              {produtos.map((p, i) => (
                <div key={i} className="flex items-start gap-2 mb-3">
                  <AutoTextarea
                    value={p}
                    onChange={(e) => {
                      const arr = [...produtos]; arr[i] = e.target.value; setProdutos(arr);
                    }}
                    className="input flex-1 min-h-[48px] max-w-[680px]"
                    maxLength={250}
                    placeholder="Ex: Chatbot através de Inteligência Artificial"
                    minRows={2}
                    maxRows={6}
                  />
                  <div style={{ width: 36, minWidth: 36, height: 36 }}>
                    {i === produtos.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setProdutos([...produtos, ""])}
                        className={`text-primary font-bold w-6 h-8 mt-4 flex items-center justify-center rounded-full bg-white border border-primary hover:bg-primary hover:text-white transition ${produtos.length === 1 ? "animate-pulse-once" : ""}`}
                        title="Adicionar novo produto/serviço"
                        disabled={produtos.length >= 10}
                      >+</button>
                    )}
                  </div>
                </div>
              ))}
              <span className="text-xs text-gray-500">
                Se desejar clique no '<b className="text-primary">+</b>' para adicionar novos campos. (Limite de 10)
              </span>
            </div>

            <div>
              <label className="block font-semibold">Perguntas Frequentes dos Clientes (FAQ):</label>
              {faqs.map((f, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <AutoTextarea
                    placeholder="Ex: Qual o horário de atendimento?"
                    value={f.q}
                    onChange={(e) => {
                      const next = [...faqs]; next[i] = { ...next[i], q: e.target.value }; setFaqs(next);
                    }}
                    className="input flex-1 min-h-[48px] max-w-[300px]"
                    maxLength={80}
                    minRows={2}
                    maxRows={4}
                  />
                  <AutoTextarea
                    className="input flex-1 min-h-[48px] max-w-[380px]"
                    placeholder="Ex: Nosso horário de atendimento é das 8h às 18h, de segunda a sexta..."
                    maxLength={300}
                    minRows={2}
                    maxRows={8}
                    value={f.a}
                    onChange={(e) => {
                      const next = [...faqs]; next[i] = { ...next[i], a: e.target.value }; setFaqs(next);
                    }}
                  />
                  <div style={{ width: 36, minWidth: 36, height: 36 }}>
                    {i === faqs.length - 1 && (
                      <button
                        type="button"
                        className="text-primary font-bold w-6 h-8 mt-4 flex items-center justify-center rounded-full bg-white border border-primary hover:bg-primary hover:text-white transition"
                        onClick={() => setFaqs([...faqs, { q: "", a: "" }])}
                        disabled={faqs.length >= 20}
                        title="Adicionar nova pergunta"
                      >+</button>
                    )}
                  </div>
                </div>
              ))}
              <span className="text-xs text-gray-500">
                Se desejar clique no '<b className="text-primary">+</b>' para adicionar novos campos. (Limite de 20)
              </span>
            </div>

            <div>
              <label className="block font-semibold">Campos Personalizados:</label>
              {customFields.map((c, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <AutoTextarea
                    placeholder="Ex: Clientes nossos:"
                    value={c.label}
                    onChange={(e) => {
                      const arr = [...customFields]; arr[i].label = e.target.value; setCustomFields(arr);
                    }}
                    className="input flex-1 min-h-[48px] max-w-[300px]"
                    maxLength={80}
                    minRows={2}
                    maxRows={4}
                  />
                  <AutoTextarea
                    placeholder="Gisele Bündchen, Neymar Jr..."
                    value={c.value}
                    onChange={(e) => {
                      const arr = [...customFields]; arr[i].value = e.target.value; setCustomFields(arr);
                    }}
                    className="input flex-1 min-h-[48px] max-w-[380px]"
                    maxLength={300}
                    minRows={2}
                    maxRows={6}
                  />
                  <div style={{ width: 36, minWidth: 36, height: 36 }}>
                    {i === customFields.length - 1 && (
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="text-primary font-bold w-6 h-8 mt-4 flex items-center justify-center rounded-full bg-white border border-primary hover:bg-primary hover:text-white transition"
                        title="Adicionar novo campo personalizado"
                        disabled={customFields.length >= 10}
                      >+</button>
                    )}
                  </div>
                </div>
              ))}
              <span className="text-xs text-gray-500">
                Se desejar clique no '<b className="text-primary">+</b>' para adicionar novos campos. (Limite de 10)
              </span>
            </div>
          </>
        )}

        {/* ==== COLABORADORES ==== */}
        {isEmployee && (
          <div className="space-y-8">
            {/*
            <div>
              <h3 className="font-semibold mb-2 text-primary">Designação de Atendentes por Área (Cargo)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Escolha, para cada cargo/área, qual atendente do painel ficará responsável pelo atendimentos.
              </p>
              <AttendantRoleRouter
                attendants={attendants}
                roles={rolesFromEmployees}
                mapping={employeeRouting}
                onChange={setEmployeeRouting}
              />
            </div>
            */}

            <div>
              <h3 className="font-semibold mb-2 text-primary">FAQ por Cargo</h3>
              <FaqByRole
                value={faqByRole}
                onChange={setFaqByRole}
                roles={rolesForFaq}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex.: Cargo “Comercial” → perguntas/respostas comuns para o time.
              </p>
            </div>
          </div>
        )}

        {!!message && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded shadow text-center font-semibold w-[380px]">
            {message}
          </div>
        )}
        <button type="submit" className="bg-primary text-white px-8 py-2 rounded-lg shadow hover:bg-purple-700 font-bold w-[230px]">
          Salvar Configurações
        </button>
      </form>

      <div className="mt-4 mb-4 px-2 py-2 bg-yellow-100 text-yellow-700 rounded shadow text-justify font-semibold w-[100%]">
        Atenção: Apesar de nenhum campo ser obrigatório, estas configurações são cruciais para o funcionamento do seu chatbot.
        <br/>Revise antes de salvar: as mudanças entram em vigor imediatamente.
      </div>
    </div>
  );
}
