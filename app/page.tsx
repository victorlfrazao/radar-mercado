"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, LineChart, Line, CartesianGrid,
} from "recharts"

// ─── Tipos ────────────────────────────────────────────────
interface Tendencia    { label: string; count: number; pct: number }
interface SkillCount   { skill: string; count: number }
interface Estado       { name: string; count: number }
interface SalarioArea  { area: string; salario: number; amostras: number }
interface VagaFreq     { title: string; count: number }
interface Palavra      { word: string; count: number }
interface HistItem     { faixa: number; count: number }
interface Empresa      { name: string; count: number }
interface HistoricoItem{ mes: string; valor: number }
interface DadosMercado {
  totalVagas: number
  tendencias: Tendencia[]
  skillCounts: SkillCount[]
  skillsMenosPedidas: SkillCount[]
  vagasMaisFrequentes: VagaFreq[]
  vagasMenosFrequentes: VagaFreq[]
  estados: Estado[]
  salarios: SalarioArea[]
  salarioGeral: number | null
  topPalavras: Palavra[]
  histogramas: { area: string; histogram: HistItem[] }[]
  topEmpresas: { area: string; companies: Empresa[] }[]
  historicoSalario: HistoricoItem[]
  categorias: { label: string; tag: string }[]
  pdiExport: { skills_em_alta: string[]; areas_em_crescimento: string[] }
  coletadoEm: string
}

const COLORS = ["#00e5a0","#4f8cff","#f5a623","#ff6b6b","#a78bfa","#34d399","#fb923c"]
type Aba = "tendencias" | "salarios" | "vagas" | "skills" | "empresas" | "pdi"

export default function Home() {
  const [dados, setDados] = useState<DadosMercado | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<Aba>("tendencias")
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("")
  const [ordemVagas, setOrdemVagas] = useState<"mais"|"menos">("mais")
  const [filtroArea, setFiltroArea] = useState<"Todas"|"tech"|"humanas"|"saude"|"outros">("Todas")
  const [ordemSkills, setOrdemSkills] = useState<"mais"|"menos">("mais")

  async function carregarDados() {
    setLoading(true); setErro(null)
    try {
      const res = await fetch("http://localhost:3001/api/mercado")
      if (!res.ok) throw new Error()
      const json: DadosMercado = await res.json()
      setDados(json)
      setUltimaAtualizacao(new Date(json.coletadoEm).toLocaleTimeString("pt-BR"))
    } catch {
      setErro('Servidor offline. Abra um PowerShell e rode: node server.js')
    } finally { setLoading(false) }
  }

  useEffect(() => { carregarDados() }, [])

  const abas: { id: Aba; label: string }[] = [
    { id: "tendencias", label: "📊 Tendências"  },
    { id: "salarios",   label: "💰 Salários"    },
    { id: "vagas",      label: "📋 Vagas"       },
    { id: "skills",     label: "🛠 Skills"      },
    { id: "empresas",   label: "🏢 Empresas"    },
    { id: "pdi",        label: "📦 Exportar PDI"},
  ]

  const tendenciasFiltradas = filtroArea === "Todas"
    ? dados?.tendencias ?? []
    : (dados?.tendencias ?? []).filter((t) => {
        const areaMap: Record<string, string[]> = {
          tech:    ["TI / Tecnologia","Engenharia","Ciência e QA","Criação e Design"],
          humanas: ["Contabilidade","Vendas","Recursos Humanos","Jurídico","Marketing","Administrativo","Consultoria","Ensino"],
          saude:   ["Saúde"],
          outros:  ["Logística","Construção","Varejo","Industrial","Atendimento"],
        }
        return areaMap[filtroArea]?.includes(t.label)
      })

  return (
    <main className="min-h-screen bg-[#0d0f12] text-[#e8eaf0] font-sans">

      {/* Topbar */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a2e38] bg-[#0d0f12] px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#00e5a0] shadow-[0_0_8px_#00e5a0]" />
          <span className="text-sm font-medium">Radar de Mercado <span className="font-light text-[#7a8099]">/ Tech Brasil</span></span>
          {!loading && !erro && <span className="rounded bg-[#00e5a0]/10 px-2 py-0.5 font-mono text-[11px] text-[#00e5a0] border border-[#00e5a0]/20">● ao vivo</span>}
        </div>
        <div className="flex items-center gap-3">
          {ultimaAtualizacao && <span className="font-mono text-[11px] text-[#7a8099]">atualizado {ultimaAtualizacao}</span>}
          <button onClick={carregarDados} className="rounded border border-[#2a2e38] px-3 py-1.5 text-xs text-[#7a8099] hover:border-[#00e5a0] hover:text-[#00e5a0] transition">↻ atualizar</button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-8 py-8">

        {erro && <div className="mb-6 rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 p-4 text-sm text-[#ff6b6b]">{erro}</div>}
        {loading && (
          <div className="flex items-center gap-3 py-12 text-sm text-[#7a8099]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2a2e38] border-t-[#00e5a0]" />
            Buscando vagas, salários e empresas na Adzuna API...
          </div>
        )}

        {dados && !loading && (
          <>
            {/* Métricas */}
            <div className="mb-6 grid grid-cols-2 gap-px bg-[#2a2e38] rounded-xl overflow-hidden md:grid-cols-4">
              {[
                { label: "Vagas encontradas", value: dados.totalVagas.toLocaleString("pt-BR"), color: "text-[#00e5a0]" },
                { label: "Categorias",         value: String(dados.categorias.length || 7),    color: "text-[#4f8cff]" },
                { label: "Salário médio",       value: dados.salarioGeral ? `R$ ${dados.salarioGeral.toLocaleString("pt-BR")}` : "N/D", color: "text-[#e8eaf0]" },
                { label: "Skills mapeadas",    value: String(dados.skillCounts.length),        color: "text-[#f5a623]" },
              ].map((m) => (
                <div key={m.label} className="bg-[#14171c] p-5">
                  <p className="mb-2 text-[11px] uppercase tracking-widest text-[#7a8099]">{m.label}</p>
                  <p className={`text-3xl font-semibold tracking-tight ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Abas */}
            <div className="mb-6 flex gap-1 border-b border-[#2a2e38] flex-wrap">
              {abas.map((a) => (
                <button key={a.id} onClick={() => setAbaAtiva(a.id)}
                  className={`px-4 py-2 text-sm rounded-t transition border-b-2 -mb-px ${abaAtiva === a.id ? "border-[#00e5a0] text-[#00e5a0]" : "border-transparent text-[#7a8099] hover:text-[#e8eaf0]"}`}>
                  {a.label}
                </button>
              ))}
            </div>

            {/* ── TENDÊNCIAS ── */}
            {abaAtiva === "tendencias" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Áreas em alta</p>
                    <div className="flex gap-1 flex-wrap">
                      {(["Todas","tech","humanas","saude","outros"] as const).map((f) => (
                        <button key={f} onClick={() => setFiltroArea(f as "Todas"|"tech"|"humanas"|"saude"|"outros")}
                          className={"rounded px-2.5 py-1 text-[11px] border transition " + (filtroArea === f ? "border-[#00e5a0] text-[#00e5a0] bg-[#00e5a0]/10" : "border-[#2a2e38] text-[#7a8099]")}>
                          {f === "Todas" ? "Todas" : f === "tech" ? "Tecnologia" : f === "humanas" ? "Humanas" : f === "saude" ? "Saúde" : "Outros"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {tendenciasFiltradas.map((t, i) => {
                      const max = Math.max(...tendenciasFiltradas.map(x => x.count), 1)
                      return (
                        <div key={t.label} className="flex items-center gap-3">
                          <span className="w-4 font-mono text-[11px] text-[#7a8099]">{i+1}</span>
                          <span className="w-44 flex-shrink-0 truncate text-sm">{t.label}</span>
                          <div className="h-1 flex-1 rounded bg-[#1c2028]">
                            <div className="h-1 rounded bg-[#00e5a0] transition-all duration-700" style={{ width: `${Math.round(t.count/max*100)}%` }} />
                          </div>
                          <span className="w-16 text-right font-mono text-[11px] text-[#7a8099]">{t.count.toLocaleString("pt-BR")}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Volume por área</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dados.tendencias} margin={{ left: -20 }}>
                      <XAxis dataKey="label" tick={{ fill:"#7a8099", fontSize:9 }} tickFormatter={(v:string)=>v.split("/")[0].trim().slice(0,8)} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }} labelStyle={{ color:"#e8eaf0" }} itemStyle={{ color:"#00e5a0" }}/>
                      <Bar dataKey="count" radius={[3,3,0,0]}>
                        {dados.tendencias.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.8}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Estados com mais vagas</p>
                  {dados.estados.length === 0
                    ? <p className="text-sm text-[#7a8099]">Localização não informada.</p>
                    : <div className="space-y-2.5">
                        {dados.estados.map((e) => {
                          const max = Math.max(...dados.estados.map(x=>x.count),1)
                          return (
                            <div key={e.name} className="flex items-center gap-3">
                              <span className="w-36 flex-shrink-0 truncate text-sm">{e.name}</span>
                              <div className="h-1 flex-1 rounded bg-[#1c2028]"><div className="h-1 rounded bg-[#4f8cff] transition-all duration-700" style={{ width:`${Math.round(e.count/max*100)}%` }}/></div>
                              <span className="w-8 text-right font-mono text-[11px] text-[#7a8099]">{e.count}</span>
                            </div>
                          )
                        })}
                      </div>}
                </div>
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Palavras-chave recorrentes</p>
                  <div className="flex flex-wrap gap-2">
                    {dados.topPalavras.map((p,i) => (
                      <span key={p.word} className="rounded px-2.5 py-1 font-mono text-xs border"
                        style={{ background: i<3?"rgba(0,229,160,0.1)":"rgba(255,255,255,0.04)", color: i<3?"#00e5a0":"#7a8099", borderColor: i<3?"rgba(0,229,160,0.3)":"#2a2e38" }}>
                        {p.word} <span style={{opacity:.5}}>{p.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SALÁRIOS ── */}
            {abaAtiva === "salarios" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Histograma de faixas salariais */}
                {dados.histogramas.filter(h=>h.histogram.length>0).map((h) => (
                  <div key={h.area} className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Distribuição salarial</p>
                    <p className="mb-4 text-xs text-[#00e5a0]">{h.area}</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={h.histogram} margin={{ left:-20 }}>
                        <XAxis dataKey="faixa" tick={{ fill:"#7a8099", fontSize:9 }} tickFormatter={(v:number)=>`R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
                        <YAxis tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }} formatter={(v:number)=>[`${v} vagas`, "Quantidade"]}/>
                        <Bar dataKey="count" fill="#00e5a0" fillOpacity={0.7} radius={[2,2,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}

                {/* Histórico */}
                {dados.historicoSalario.length > 0 && (
                  <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5 md:col-span-2">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Evolução histórica de salários</p>
                    <p className="mb-4 text-xs text-[#7a8099]">Média mensal — área de desenvolvimento</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={dados.historicoSalario} margin={{ left:-10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2e38"/>
                        <XAxis dataKey="mes" tick={{ fill:"#7a8099", fontSize:10 }} axisLine={false} tickLine={false}/>
                        <YAxis tick={{ fill:"#7a8099", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={(v:number)=>`R$${(v/1000).toFixed(0)}k`}/>
                        <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }} formatter={(v:number)=>[`R$ ${v.toLocaleString("pt-BR")}`, "Salário médio"]}/>
                        <Line type="monotone" dataKey="valor" stroke="#00e5a0" strokeWidth={2} dot={{ fill:"#00e5a0", r:3 }}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Salários por área (da busca) */}
                {dados.salarios.length > 0 && (
                  <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5 md:col-span-2">
                    <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Salário médio por área</p>
                    <div className="divide-y divide-[#2a2e38]">
                      {dados.salarios.map(s=>(
                        <div key={s.area} className="flex items-center justify-between py-2.5">
                          <span className="text-sm">{s.area}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-[#00e5a0]">R$ {s.salario.toLocaleString("pt-BR")}</span>
                            <span className="font-mono text-[10px] text-[#7a8099]">({s.amostras} vagas)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dados.salarios.length === 0 && dados.histogramas.filter(h=>h.histogram.length>0).length === 0 && (
                  <div className="md:col-span-2 rounded-xl border border-[#2a2e38] bg-[#14171c] p-8 text-center">
                    <p className="text-sm text-[#7a8099]">A Adzuna BR raramente informa salários nas vagas. Os dados de histograma podem estar indisponíveis para este país.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── VAGAS ── */}
            {abaAtiva === "vagas" && (
              <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Frequência de vagas</p>
                  <div className="flex gap-2">
                    <button onClick={()=>setOrdemVagas("mais")} className={`rounded px-3 py-1 text-xs border transition ${ordemVagas==="mais"?"border-[#00e5a0] text-[#00e5a0] bg-[#00e5a0]/10":"border-[#2a2e38] text-[#7a8099]"}`}>Mais frequentes</button>
                    <button onClick={()=>setOrdemVagas("menos")} className={`rounded px-3 py-1 text-xs border transition ${ordemVagas==="menos"?"border-[#ff6b6b] text-[#ff6b6b] bg-[#ff6b6b]/10":"border-[#2a2e38] text-[#7a8099]"}`}>Menos frequentes</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {(ordemVagas==="mais" ? dados.vagasMaisFrequentes : dados.vagasMenosFrequentes).map((v,i)=>(
                    <div key={v.title} className="flex items-center justify-between rounded-lg border border-[#2a2e38] bg-[#1c2028] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-[#7a8099]">{String(i+1).padStart(2,"0")}</span>
                        <span className="text-sm">{v.title}</span>
                      </div>
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${ordemVagas==="mais"?"bg-[#00e5a0]/10 text-[#00e5a0]":"bg-[#ff6b6b]/10 text-[#ff6b6b]"}`}>{v.count}x</span>
                    </div>
                  ))}
                  {(ordemVagas==="mais"?dados.vagasMaisFrequentes:dados.vagasMenosFrequentes).length===0 && (
                    <p className="text-sm text-[#7a8099] py-4">Nenhum dado disponível.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── SKILLS ── */}
            {abaAtiva === "skills" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Skills por demanda</p>
                    <div className="flex gap-2">
                      <button onClick={()=>setOrdemSkills("mais")} className={`rounded px-3 py-1 text-xs border transition ${ordemSkills==="mais"?"border-[#00e5a0] text-[#00e5a0] bg-[#00e5a0]/10":"border-[#2a2e38] text-[#7a8099]"}`}>Mais pedidas</button>
                      <button onClick={()=>setOrdemSkills("menos")} className={`rounded px-3 py-1 text-xs border transition ${ordemSkills==="menos"?"border-[#ff6b6b] text-[#ff6b6b] bg-[#ff6b6b]/10":"border-[#2a2e38] text-[#7a8099]"}`}>Menos pedidas</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(ordemSkills==="mais"?dados.skillCounts:dados.skillsMenosPedidas).map((s,i)=>{
                      const max=Math.max(...dados.skillCounts.map(x=>x.count),1)
                      return (
                        <div key={s.skill} className="flex items-center gap-3">
                          <span className="w-4 font-mono text-[11px] text-[#7a8099]">{i+1}</span>
                          <span className="w-28 flex-shrink-0 font-mono text-sm">{s.skill}</span>
                          <div className="h-1 flex-1 rounded bg-[#1c2028]">
                            <div className="h-1 rounded transition-all duration-700" style={{ width:`${Math.round(s.count/max*100)}%`, background: ordemSkills==="mais"?"#00e5a0":"#ff6b6b" }}/>
                          </div>
                          <span className="w-10 text-right font-mono text-[11px] text-[#7a8099]">{s.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Distribuição top 7</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={dados.skillCounts.slice(0,7)} dataKey="count" nameKey="skill" cx="50%" cy="50%" outerRadius={90} label={({skill})=>skill}>
                        {dados.skillCounts.slice(0,7).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── EMPRESAS ── */}
            {abaAtiva === "empresas" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {dados.topEmpresas.map((grupo) => (
                  <div key={grupo.area} className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Top empresas</p>
                    <p className="mb-4 text-xs text-[#00e5a0]">{grupo.area}</p>
                    {grupo.companies.length === 0
                      ? <p className="text-sm text-[#7a8099]">Sem dados.</p>
                      : <div className="space-y-2">
                          {grupo.companies.map((c,i)=>(
                            <div key={c.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-[#7a8099]">{i+1}</span>
                                <span className="text-sm truncate max-w-[140px]">{c.name}</span>
                              </div>
                              <span className="font-mono text-xs text-[#4f8cff] bg-[#4f8cff]/10 px-2 py-0.5 rounded">{c.count}</span>
                            </div>
                          ))}
                        </div>}
                  </div>
                ))}
                {dados.topEmpresas.every(g=>g.companies.length===0) && (
                  <div className="md:col-span-3 rounded-xl border border-[#2a2e38] bg-[#14171c] p-8 text-center">
                    <p className="text-sm text-[#7a8099]">Dados de empresas não retornados pela Adzuna BR para estas buscas.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── PDI ── */}
            {abaAtiva === "pdi" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Exportação para o PDI</p>
                  <p className="mb-4 text-xs text-[#7a8099]">Dados prontos para integrar com o módulo de PDI</p>
                  <pre className="rounded-lg bg-[#0d0f12] border border-[#2a2e38] p-4 font-mono text-xs text-[#00e5a0] overflow-auto">
                    {JSON.stringify(dados.pdiExport, null, 2)}
                  </pre>
                  <button
                    onClick={()=>{
                      const blob = new Blob([JSON.stringify(dados.pdiExport,null,2)],{type:"application/json"})
                      const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="pdi-export.json"; a.click()
                    }}
                    className="mt-3 w-full rounded border border-[#00e5a0] bg-[#00e5a0]/10 py-2 text-sm text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
                    ↓ Baixar pdi-export.json
                  </button>
                </div>
                <div className="rounded-xl border border-[#2a2e38] bg-[#14171c] p-5">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">Resumo</p>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#7a8099] mb-2">Skills em alta</p>
                      <div className="flex flex-wrap gap-1">
                        {dados.pdiExport.skills_em_alta.map(s=>(
                          <span key={s} className="rounded px-2 py-0.5 font-mono text-xs bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/20">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[#7a8099] mb-2">Áreas em crescimento</p>
                      <div className="flex flex-wrap gap-1">
                        {dados.pdiExport.areas_em_crescimento.map(a=>(
                          <span key={a} className="rounded px-2 py-0.5 text-xs bg-[#4f8cff]/10 text-[#4f8cff] border border-[#4f8cff]/20">{a}</span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#2a2e38]">
                      <p className="text-[#7a8099] text-xs mb-1">Endpoint direto para o PDI:</p>
                      <code className="text-[11px] text-[#f5a623] font-mono">http://localhost:3001/api/pdi</code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-[#2a2e38] py-6 text-center font-mono text-[11px] text-[#7a8099]">
        Fonte: <span className="text-[#00e5a0]">Adzuna API</span> · Projeto acadêmico — sem fins comerciais
      </footer>
    </main>
  )
}
