import React, { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";

export default function ConfigChatbotPage() {
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

  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const COMPANY_ID = user ? user.company_id : null;
  const API_URL = import.meta.env.VITE_API_URL;

  function handleAddCustomField() {
    if (customFields.length < 10)
      setCustomFields([...customFields, { label: "", value: "" }]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const chatbotConfig = {
      nome_bot: nomeBot,
      tom_voz: tomVoz,
      mensagem_boas_vindas: mensagemBoasVindas,
      emoji,
      permite_arquivo: permiteArquivo,
      permite_audio: permiteAudio,
      permite_pagamento: permitePagamento,
      segmento,
      diferenciais: diferenciais.filter(d => d.trim() !== ""),
      missao,
      persona,
      produtos: produtos.filter(p => p.trim() !== ""),
      extra_fields: customFields.filter(c => c.label.trim() && c.value.trim())
    };

    fetch(`${API_URL}/chatbot/config?company_id=${COMPANY_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
      },
      body: JSON.stringify(chatbotConfig)
    })
      .then(res => res.json())
      .then(data => {
        setMessage(data.message || "Configuração salva com sucesso!");
        setTimeout(() => setMessage(""), 3000);
      })
      .catch(() => alert("Erro ao salvar as configurações do chatbot!"));
  }

  useEffect(() => {
    if (!COMPANY_ID) return;
    authFetch(`${API_URL}/chatbot/config?company_id=${COMPANY_ID}`)
      .then(res => {
        if (!res.ok) throw new Error("Falha ao carregar configurações.");
        return res.json();
      })
      .then(data => {
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
        setCustomFields(data.extra_fields && data.extra_fields.length > 0 ? data.extra_fields : [{ label: "", value: "" }]);
      })
      .catch(err => {
        console.log("Erro ao buscar configs:", err);
      });
  }, [COMPANY_ID]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Configuração do Chatbot</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personalidade do Bot */}
        <div>
          <h3 className="font-semibold mb-2 text-primary">Personalidade do Bot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Nome do Bot:</label>
              <input
                className="input max-w-[640px]"
                value={nomeBot}
                onChange={e => setNomeBot(e.target.value)}
                maxLength={60}
                placeholder="Ex: Aura Bot"
              />
            </div>
            <div>
              <label className="block text-sm">Tom de Voz:</label>
              <input
                className="input max-w-[640px]"
                value={tomVoz}
                onChange={e => setTomVoz(e.target.value)}
                maxLength={100}
                placeholder="Ex: Descontraído, bem-humorado, educado"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm">Mensagem Boas-vindas:</label>
              <textarea
                className="input min-h-[40px] max-w-[100%]"
                value={mensagemBoasVindas}
                onChange={e => setMensagemBoasVindas(e.target.value)}
                maxLength={120}
                placeholder="Ex: Olá! Tudo bem? Como posso te ajudar hoje? 😊"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm">Emojis de preferência:</label>
              <input
                className="input max-w-[640px]"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                maxLength={10}
                placeholder="Ex: 😊,🤖"
              />
            </div>
          </div>
        </div>
        {/* Instruções */}
        <div>
          <h3 className="font-semibold mb-2 text-primary">Base de instruções e conhecimentos do Chatbot</h3>
            <div className="mt-4 mb-4 px-2 py-2 bg-yellow-100 text-yellow-700 rounded shadow text-justify font-semibold w-[100%]">
                Atenção: É importante ressaltar que estas informações devem ser diretas e objetivas, evitando informações excessivas ou desnecessárias. <br/><br/>
                Portanto, se desejar informar detalhes em larga escala, por favor transcreva em um documento .docx, .xslx ou .pdf e insira-o na seção de Configuração de Documentos, conforme alinhado previamente com a equipe da New Aura AI.
            </div>
          <div className="flex gap-8 flex-wrap">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={permiteArquivo} onChange={e => setPermiteArquivo(e.target.checked)} />
              Permite Envio de Arquivos
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={permiteAudio} onChange={e => setPermiteAudio(e.target.checked)} />
              Permite Envio de Áudio
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={permitePagamento} onChange={e => setPermitePagamento(e.target.checked)} />
              Permite Pagamento pelo Chat
            </label>
          </div>
        </div>
        {/* Objetivo e Personalidade */}
        <div>
          <label className="block font-semibold">Objetivo e Personalidade do Bot:</label>
          <textarea
            value={persona}
            onChange={e => setPersona(e.target.value)}
            className="input min-h-[48px] max-w-[100%]"
            maxLength={500}
            placeholder="Ex: Atue como um vendedor, tendo como objetivo tentar vender meus produtos, dando sugestões e ideias para induzir o Cliente a comprar..."
            rows={6}
          />
        </div>
        {/* Segmento */}
        <div>
          <label className="block font-semibold">Segmento da Empresa:</label>
          <input
            value={segmento}
            onChange={e => setSegmento(e.target.value)}
            className="input max-w-[100%]"
            maxLength={120}
            placeholder="Ex: Somos um e-commerce de moda masculina e feminina..."
          />
        </div>
        {/* Diferenciais */}
        <div>
          <label className="block font-semibold">Diferenciais da Empresa:</label>
          {diferenciais.map((d, i) => (
            <div key={i} className="flex items-start gap-2 mb-3">
              <textarea
                value={d}
                onChange={e => {
                  const arr = [...diferenciais]; arr[i] = e.target.value; setDiferenciais(arr);
                }}
                className="input flex-1 min-h-[36px] max-w-[680px]"
                maxLength={300}
                placeholder="Ex: Atendimento 24 horas, personalizamos e ajustamos conforme o gosto do cliente..."
                rows={2}
              />
              <div style={{ width: 36, minWidth: 36, height: 36 }}>
                {i === diferenciais.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setDiferenciais([...diferenciais, ""])}
                    className={`text-primary font-bold w-8 h-8 flex items-center justify-center rounded-full bg-white border border-primary hover:bg-primary hover:text-white transition
                      ${diferenciais.length === 1 ? "animate-pulse-once" : ""}
                    `}
                    title="Adicionar novo diferencial"
                    disabled={diferenciais.length >= 10}
                  >+</button>
                )}
              </div>
            </div>
          ))}
          <span className="text-xs text-gray-500">
            Digite um diferencial por vez e clique no ícone de '<b className="text-primary">+</b>' à direita para adicionar. (Limite de 10)
          </span>
        </div>
        {/* Missão */}
        <div>
          <label className="block font-semibold">Missão da Empresa:</label>
          <textarea
            value={missao}
            onChange={e => setMissao(e.target.value)}
            className="input min-h-[48px] max-w-[680px]"
            maxLength={300}
            placeholder="Ex: Inovar o setor de moda, fornecer um ambiente onde o cliente se sinta confortável..."
            rows={4}
          />
        </div>
        {/* Produtos/Serviços */}
        <div>
          <label className="block font-semibold">Produtos/Serviços Principais da Empresa:</label>
          {produtos.map((p, i) => (
            <div key={i} className="flex items-start gap-2 mb-3">
              <textarea
                value={p}
                onChange={e => {
                  const arr = [...produtos]; arr[i] = e.target.value; setProdutos(arr);
                }}
                className="input flex-1 min-h-[48px] max-w-[680px]"
                maxLength={250}
                placeholder="Ex: Chatbot através de Inteligência Artificial"
                rows={2}
              />
              <div style={{ width: 36, minWidth: 36, height: 36 }}>
                {i === produtos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setProdutos([...produtos, ""])}
                    className={`text-primary font-bold w-8 h-8 flex items-center justify-center rounded-full bg-white border border-primary hover:bg-primary hover:text-white transition
                      ${produtos.length === 1 ? "animate-pulse-once" : ""}
                    `}
                    title="Adicionar novo produto/serviço"
                    disabled={produtos.length >= 10}
                  >+</button>
                )}
              </div>
            </div>
          ))}
          <span className="text-xs text-gray-500">
            Digite um produto/serviço por vez e clique no ícone de '<b className="text-primary">+</b>' à direita para adicionar. (Limite de 10)
          </span>
        </div>
        {/* Campos Personalizados */}
        <div>
          <label className="block font-semibold">Campos Personalizados:</label>
          {customFields.map((c, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <textarea
                placeholder="Ex: Clientes nossos:"
                value={c.label}
                onChange={e => {
                  const arr = [...customFields]; arr[i].label = e.target.value; setCustomFields(arr);
                }}
                className="input flex-1 min-h-[48px] max-w-[300px]"
                maxLength={80}
                rows={2}
              />
              <textarea
                placeholder="Giselle Bundchen, Neymar Jr..."
                value={c.value}
                onChange={e => {
                  const arr = [...customFields]; arr[i].value = e.target.value; setCustomFields(arr);
                }}
                className="input flex-1 min-h-[48px] max-w-[380px]"
                maxLength={300}
                rows={2}
              />
              <div style={{ width: 36, minWidth: 36, height: 36 }}>
                {i === customFields.length - 1 && (
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="text-primary font-bold w-8 h-8 flex items-center justify-center rounded-full bg-white border border-primary hover:bg-primary hover:text-white transition"
                    title="Adicionar novo campo personalizado"
                    disabled={customFields.length >= 10}
                  >+</button>
                )}
              </div>
            </div>
          ))}
          <span className="text-xs text-gray-500">
            Digite um campo personalizado por vez e clique no ícone de '<b className="text-primary">+</b>' à direita para adicionar. (Limite de 10)
          </span>
        </div>
        {/* Mensagem de sucesso */}
        {!!message && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded shadow text-center font-semibold w-[380px]">
            {message}
          </div>
        )}
        <button type="submit" className="bg-primary text-white px-8 py-2 rounded-lg shadow hover:bg-purple-700 font-bold w-[230px]">Salvar Configurações</button>
      </form>
        <div className="mt-4 mb-4 px-2 py-2 bg-yellow-100 text-yellow-700 rounded shadow text-justify font-semibold w-[100%]">
            Atenção: Apesar de nenhum campo ser obrigatório, estas configurações são cruciais para o funcionamento do seu chatbot, pois moldam a sua base de conhecimento e comportamento. <br/><br/>
            Certifique-se de revisar todas as mudanças e informações antes de salvar, uma vez alterada elas entrarão em vigor imediatamente!
        </div>
    </div>
  );
}
