import React, { useRef } from "react";
import AutoTextarea from "../utils/AutoTextarea";

function useIdFactory(prefix = "id") {
  const c = useRef(0);
  return () => `${prefix}-${++c.current}-${Date.now()}`;
}

export default function FaqByRole({ roles = [], value = [], onChange }) {
  const newBlockId = useIdFactory("block");
  const newQaId = useIdFactory("qa");

  function commit(next) {
    const withIds = next.map(b => ({
      _id: b._id || newBlockId(),
      role_id: b.role_id,
      qa: (b.qa || []).map(x => ({
        id: x.id || newQaId(),
        q: x.q,
        a: x.a
      })),
    }));
    onChange(withIds);
  }

  function addCargoBlock() {
    commit([...value, { _id: newBlockId(), role_id: "", qa: [{ id: newQaId(), q: "", a: "" }] }]);
  }
  function removeCargoBlock(blockId) {
    commit(value.filter(b => b._id !== blockId));
  }
  function updateRoleId(blockId, newId) {
    commit(value.map(b => (b._id === blockId ? { ...b, role_id: newId === "" ? "" : Number(newId) } : b)));
  }
  function addQA(blockId) {
    commit(value.map(b => (b._id === blockId ? { ...b, qa: [...b.qa, { id: newQaId(), q: "", a: "" }] } : b)));
  }
  function updateQA(blockId, qaId, field, val) {
    commit(value.map(b => {
      if (b._id !== blockId) return b;
      return { ...b, qa: b.qa.map(x => (x.id === qaId ? { ...x, [field]: val } : x)) };
    }));
  }
  function removeQA(blockId, qaId) {
    commit(value.map(b => (b._id === blockId ? { ...b, qa: b.qa.filter(x => x.id !== qaId) } : b)));
  }

  const roleLabel = (id) => {
    const r = roles.find(x => x.id === id);
    if (!r) return "—";
    return typeof r.access_level === "number" ? `${r.role} (Nível ${r.access_level})` : r.role;
  };

  return (
    <div className="space-y-4">
      {value.map(block => {
        const alreadySelectedExceptMe = new Set(
          value.filter(b => b._id !== block._id).map(b => b.role_id).filter(Boolean)
        );

        return (
          <div key={block._id} className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <select
                  className="w-full border rounded px-3 py-2"
                  value={block.role_id ?? ""}
                  onChange={(e) => updateRoleId(block._id, e.target.value)}
                >
                  <option key="opt-default" value="">Selecione um cargo…</option>
                  {roles.map(r => (
                    <option key={`opt-${r.id}`} value={r.id} disabled={alreadySelectedExceptMe.has(r.id)}>
                      {typeof r.access_level === "number" ? `${r.role} (Nível ${r.access_level})` : r.role}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="text-red-600 hover:text-red-700 text-sm" onClick={() => removeCargoBlock(block._id)}>
                Remover cargo
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {block.qa.map(item => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  <AutoTextarea
                    placeholder="Pergunta"
                    className="border rounded px-3 py-2 w-full"
                    value={item.q}
                    onChange={(e) => updateQA(block._id, item.id, "q", e.target.value)}
                    minRows={2}
                    maxRows={6}
                  />
                  <div className="flex gap-2">
                    <AutoTextarea
                      placeholder="Resposta"
                      className="border rounded px-3 py-2 w-full"
                      value={item.a}
                      onChange={(e) => updateQA(block._id, item.id, "a", e.target.value)}
                      minRows={2}
                      maxRows={10}
                    />
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700 text-sm whitespace-nowrap"
                      onClick={() => removeQA(block._id, item.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="text-primary hover:underline text-sm" onClick={() => addQA(block._id)}>
                + Adicionar Pergunta e Resposta.
              </button>
            </div>

            {block.role_id && (
              <div className="mt-2 text-xs text-gray-500">
                Cargo selecionado: <strong>{roleLabel(block.role_id)}</strong>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" className="text-primary hover:underline text-sm" onClick={addCargoBlock}>
        + Adicionar cargo
      </button>
    </div>
  );
}
