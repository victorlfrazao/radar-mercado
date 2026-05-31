"use client"

import { useEffect, useState, useCallback } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, Legend,
} from "recharts"

// ─── Tipos ───────────────────────────────────────────────
interface VisaoGeral {
  totalVagas: number
  porCategoria: { categoria: string; total: number }[]
  porEstado: { estado: string; total: number }[]
  salarioMedio: number | null
  topEmpresas: { empresa: string; total: number }[]
  topHardSkills: { skill: string; count: number }[]
  topSoftSkills: { skill: string; count: number }[]
}
interface Areas {
  porCategoria: { categoria: string; total: number; salarioMedio: number | null }[]
  porNivel: { nivel: string; total: number }[]
  porModalidade: { modalidade: string; total: number }[]
  porContrato: { contrato: string; total: number }[]
}
interface Localizacao {
  porEstado: { estado: string; regiao: string; total: number; salarioMedio: number | null }[]
  porRegiao: { regiao: string; total: number }[]
  porCidade: { cidade: string; estado: string; total: number }[]
}
interface Salarios {
  geral: { media: number | null; minimo: number | null; maximo: number | null; amostras: number }
  porCategoria: { categoria: string; media: number | null; mediaMax: number | null; minimo: number | null; maximo: number | null; amostras: number }[]
  porNivel: { nivel: string; media: number | null; amostras: number }[]
  porEstado: { estado: string; media: number | null; amostras: number }[]
  porModalidade: { modalidade: string; media: number | null; amostras: number }[]
  topEmpresas: { empresa: string; media: number | null; amostras: number }[]
}
interface Habilidades {
  tipo: string
  total: number
  topSkills: { skill: string; count: number; salarioMedio: number | null }[]
  menosRequisitadas: { skill: string; count: number }[]
  skillsPorCategoria: { categoria: string; topSkills: { skill: string; count: number }[] }[]
}

type Secao = "visao-geral" | "setores" | "localidade" | "salarios" | "habilidades"

const COLORS = ["#00e5a0","#4f8cff","#f5a623","#ff6b6b","#a78bfa","#34d399","#fb923c","#38bdf8"]
const CATEGORIAS = ["Tecnologia","Administrativo","Industrial","Saúde","Jurídico","Educação","Outros"]
const ESTADOS = ["SP","RJ","MG","RS","PR","SC","BA","PE","CE","GO","DF","ES","AM","PA","MT","MS","RN","PB","AL","SE","PI","MA","RO","TO","AC","AP","RR"]

const fmt = (v: number | null) => v ? `R$ ${v.toLocaleString("pt-BR")}` : "N/D"

// ─── Componentes auxiliares ───────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#2a2e38] bg-[#14171c] p-5 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-[#7a8099]">{children}</p>
}

function BarraHorizontal({ label, value, max, cor = "#00e5a0", extra }: {
  label: string; value: number; max: number; cor?: string; extra?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <span className="w-36 flex-shrink-0 truncate text-sm">{label}</span>
      <div className="h-1.5 flex-1 rounded bg-[#1c2028]">
        <div className="h-1.5 rounded transition-all duration-700" style={{ width: `${Math.round(value/max*100)}%`, background: cor }} />
      </div>
      <span className="w-20 text-right font-mono text-[11px] text-[#7a8099]">{extra || value.toLocaleString("pt-BR")}</span>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-[#7a8099]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2a2e38] border-t-[#00e5a0]" />
      Carregando dados do banco...
    </div>
  )
}

function FiltroSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[#7a8099] uppercase tracking-wider flex-shrink-0">{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-[#1c2028] border border-[#2a2e38] rounded px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#00e5a0]"
      >
        <option value="">Todos</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Seções ───────────────────────────────────────────────

function SecaoVisaoGeral({ data }: { data: VisaoGeral }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

      {/* Áreas — pizza */}
      <Card>
        <CardTitle>Áreas</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data.porCategoria} dataKey="total" nameKey="categoria"
              cx="50%" cy="50%" outerRadius={75}>
              {data.porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:11 }}
              formatter={(value: number, name: string) => [value.toLocaleString("pt-BR"), name]}
            />
            <Legend wrapperStyle={{ fontSize:10, color:"#7a8099" }}/>
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Localidade — barras verticais por região */}
      <Card>
        <CardTitle>Localidade</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.porEstado.slice(0,6)} margin={{ left:-20, bottom:10 }}>
            <XAxis dataKey="estado" tick={{ fill:"#7a8099", fontSize:10 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:11 }} labelStyle={{ color:"#e8eaf0" }} itemStyle={{ color:"#e8eaf0" }} formatter={(v:number) => [v.toLocaleString("pt-BR"), "vagas"]}/>
            <Bar dataKey="total" radius={[3,3,0,0]}>
              {data.porEstado.slice(0,6).map((_,i) => <Cell key={i} fill="#4f8cff" fillOpacity={1 - i*0.1}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Salário — mini histograma simulado com porCategoria */}
      <Card>
        <CardTitle>Salário</CardTitle>
        <div className="flex flex-col justify-center h-[200px] gap-3 px-2">
          <div className="text-center">
            <p className="text-[11px] text-[#7a8099] uppercase tracking-wider mb-1">Média geral</p>
            <p className="text-3xl font-semibold text-[#00e5a0]">{fmt(data.salarioMedio)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg bg-[#1c2028] p-3 text-center">
              <p className="text-[10px] text-[#7a8099] mb-1">Total de vagas</p>
              <p className="text-lg font-semibold text-[#4f8cff]">{data.totalVagas.toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded-lg bg-[#1c2028] p-3 text-center">
              <p className="text-[10px] text-[#7a8099] mb-1">Áreas</p>
              <p className="text-lg font-semibold text-[#f5a623]">{data.porCategoria.length}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Empresas — barras horizontais */}
      <Card>
        <CardTitle>Empresas</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.topEmpresas.slice(0,5)} layout="vertical" margin={{ left:8 }}>
            <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="empresa" tick={{ fill:"#e8eaf0", fontSize:10 }} axisLine={false} tickLine={false} width={110} tickFormatter={(v:string)=>v.slice(0,14)}/>
            <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:11 }} formatter={(v:number) => [v.toLocaleString("pt-BR"), "vagas"]}/>
            <Bar dataKey="total" fill="#f5a623" fillOpacity={0.85} radius={[0,3,3,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Hard Skills — barras horizontais */}
      <Card>
        <CardTitle>Habilidades técnicas</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.topHardSkills.slice(0,6)} layout="vertical" margin={{ left:8 }}>
            <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="skill" tick={{ fill:"#e8eaf0", fontSize:10 }} axisLine={false} tickLine={false} width={80}/>
            <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:11 }} formatter={(v:number) => [v.toLocaleString("pt-BR"), "vagas"]}/>
            <Bar dataKey="count" fill="#00e5a0" fillOpacity={0.85} radius={[0,3,3,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Soft Skills — barras horizontais */}
      <Card>
        <CardTitle>Habilidades interpessoais</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.topSoftSkills.slice(0,5)} layout="vertical" margin={{ left:8 }}>
            <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="skill" tick={{ fill:"#e8eaf0", fontSize:10 }} axisLine={false} tickLine={false} width={120} tickFormatter={(v:string)=>v.slice(0,16)}/>
            <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:11 }} formatter={(v:number) => [v.toLocaleString("pt-BR"), "vagas"]}/>
            <Bar dataKey="count" fill="#a78bfa" fillOpacity={0.85} radius={[0,3,3,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

    </div>
  )
}

function SecaoSetores() {
  const [data, setData] = useState<Areas | null>(null)
  const [loading, setLoading] = useState(true)
  const [estado, setEstado] = useState("")
  const [salMin, setSalMin] = useState(0)
  const [nivel, setNivel] = useState("")

  const NIVEIS = ["Não informado","Estágio/Trainee","Júnior","Pleno","Sênior","Liderança"]

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (estado)  params.set("estado",  estado)
    if (salMin > 0) params.set("salMin", String(salMin))
    if (nivel)   params.set("nivel",   nivel)
    const res = await fetch(`/api/setores?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [estado, salMin, nivel])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <Loading />
  if (!data) return null

  return (
    <div className="space-y-4">

      {/* Filtros centralizados sem título */}
      <Card>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <FiltroSelect label="Local"      options={ESTADOS} value={estado}  onChange={setEstado} />
          <FiltroSelect label="Experiência" options={NIVEIS}  value={nivel}   onChange={setNivel}  />

          {/* Slider salário */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#7a8099] uppercase tracking-wider flex-shrink-0">Salário mín:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[#7a8099] w-16">R$ {(salMin/1000).toFixed(0)}k</span>
              <input type="range" min={0} max={20000} step={1} value={salMin}
                onChange={e => setSalMin(Number(e.target.value))}
                className="w-32 accent-[#00e5a0] cursor-pointer" />
              <span className="font-mono text-[11px] text-[#7a8099] w-16">R$ 20k</span>
            </div>
          </div>

          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      {/* Volume por setor — barras horizontais, sem título, largura total */}
      <Card>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.porCategoria} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="categoria" tick={{ fill:"#e8eaf0", fontSize:11 }} axisLine={false} tickLine={false} width={110}/>
            <Tooltip
              contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }}
              labelStyle={{ color:"#e8eaf0" }}
              itemStyle={{ color:"#e8eaf0" }}
              formatter={(v:number) => [v.toLocaleString("pt-BR"), "vagas"]}
            />
            <Bar dataKey="total" radius={[0,3,3,0]}>
              {data.porCategoria.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.8}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

    </div>
  )
}



// Mapeamento sigla → nome do estado no GeoJSON
const SIGLA_MAP: Record<string, string> = {
  AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",
  DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",
  MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",
  PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",
  RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",
  SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins",
}

function MapaBrasil({ porEstado }: { porEstado: { estado: string; total: number }[] }) {
  const [tooltip, setTooltip] = useState<{ nome: string; total: number; x: number; y: number } | null>(null)
  const maxEst = Math.max(...porEstado.map(e => e.total), 1)

  const getColor = (sigla: string) => {
    const est = porEstado.find(e => e.estado === sigla)
    if (!est) return "#1c2028"
    const pct = est.total / maxEst
    if (pct > 0.7) return "#00e5a0"
    if (pct > 0.4) return "#4f8cff"
    if (pct > 0.2) return "#f5a623"
    if (pct > 0.05) return "#a78bfa"
    return "#2a2e38"
  }

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 750, center: [-54, -14] }}
        style={{ width:"100%", height:"360px" }}
      >
        <ZoomableGroup>
          <Geographies geography="https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson">
            {({ geographies }) =>
              geographies.map(geo => {
                const nome = geo.properties.name as string
                const sigla = (geo.properties.sigla as string) || Object.entries(SIGLA_MAP).find(([, n]) => n === nome)?.[0] || ""
                const est = porEstado.find(e => e.estado === sigla)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(sigla)}
                    stroke="#0d0f12"
                    strokeWidth={0.5}
                    style={{
                      default: { outline:"none" },
                      hover:   { outline:"none", fill:"#00e5a0", opacity:0.8, cursor:"pointer" },
                      pressed: { outline:"none" },
                    }}
                    onMouseEnter={(e) => {
                      setTooltip({ nome, total: est?.total || 0, x: e.clientX, y: e.clientY })
                    }}
                    onMouseMove={(e) => {
                      setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tooltip && (
        <div className="fixed z-50 pointer-events-none rounded-lg border border-[#2a2e38] bg-[#1c2028] px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <p className="font-medium text-[#e8eaf0]">{tooltip.nome}</p>
          <p className="text-[#00e5a0]">{tooltip.total.toLocaleString("pt-BR")} vagas</p>
        </div>
      )}
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-[#7a8099]">
        {[
          { cor:"#00e5a0", label:">70%" },
          { cor:"#4f8cff", label:"40-70%" },
          { cor:"#f5a623", label:"20-40%" },
          { cor:"#a78bfa", label:"5-20%" },
          { cor:"#2a2e38", label:"<5%" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: l.cor }}/>
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}


function SecaoLocalidade() {
  const [data, setData] = useState<Localizacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState("")
  const [salMin, setSalMin] = useState(0)
  const [regiao, setRegiao] = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoria) params.set("categoria", categoria)
    if (salMin > 0) params.set("salMin", String(salMin))
    if (regiao) params.set("regiao", regiao)
    const res = await fetch(`/api/localidade?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [categoria, salMin, regiao])

  useEffect(() => { carregar() }, [carregar])

  const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]
  const maxReg = data ? Math.max(...data.porRegiao.map(r => r.total), 1) : 1
  const maxEst = data ? Math.max(...data.porEstado.map(e => e.total), 1) : 1

  return (
    <div className="space-y-4">

      {/* Filtros centralizados sem título */}
      <Card>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <FiltroSelect label="Setor" options={CATEGORIAS} value={categoria} onChange={setCategoria} />

          {/* Filtro Região */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7a8099] uppercase tracking-wider flex-shrink-0">Região:</span>
            <select value={regiao} onChange={e => setRegiao(e.target.value)}
              className="bg-[#1c2028] border border-[#2a2e38] rounded px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#00e5a0]">
              <option value="">Todos</option>
              {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Slider salário */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#7a8099] uppercase tracking-wider flex-shrink-0">Salário mín:</span>
            <div className="flex flex-col gap-1">
              <input type="range" min={0} max={20000} step={1} value={salMin}
                onChange={e => setSalMin(Number(e.target.value))}
                style={{ width: "200px", accentColor: "#00e5a0", cursor: "pointer" }} />
              <span className="font-mono text-[11px] text-[#00e5a0]">R$ {salMin.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      {loading ? <Loading /> : data && (
        <div className="grid grid-cols-2 gap-4">

          {/* Mapa sem título */}
          <Card>
            <MapaBrasil porEstado={data.porEstado} />
          </Card>

          {/* Caixa região/estado sem título */}
          <Card>
            {regiao === "" ? (
              // Mostra regiões
              <div className="space-y-2.5">
                {data.porRegiao.map(r => (
                  <BarraHorizontal key={r.regiao} label={r.regiao} value={r.total} max={maxReg} cor="#4f8cff" />
                ))}
              </div>
            ) : (
              // Mostra estados da região selecionada
              <div className="space-y-2.5">
                {data.porEstado
                  .filter(e => e.regiao === regiao)
                  .map(e => (
                    <BarraHorizontal key={e.estado} label={e.estado} value={e.total} max={maxEst} cor="#00e5a0" />
                  ))}
                {data.porEstado.filter(e => e.regiao === regiao).length === 0 && (
                  <p className="text-sm text-[#7a8099]">Nenhuma vaga para esta região.</p>
                )}
              </div>
            )}
          </Card>

        </div>
      )}
    </div>
  )
}


function SecaoSalarios() {
  const [hist, setHist] = useState<{
    histograma: { faixa: number; label: string; count: number }[]
    media: number | null
    minimo: number | null
    maximo: number | null
    amostras: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState("")
  const [estado, setEstado]       = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoria) params.set("categoria", categoria)
    if (estado)    params.set("estado",    estado)
    const res = await fetch(`/api/salarios-hist?${params}`)
    setHist(await res.json())
    setLoading(false)
  }, [categoria, estado])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="space-y-4">

      {/* Filtros centralizados sem título */}
      <Card>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <FiltroSelect label="Setor" options={CATEGORIAS} value={categoria} onChange={setCategoria} />
          <FiltroSelect label="Local" options={ESTADOS}    value={estado}    onChange={setEstado}    />
          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      {loading ? <Loading /> : hist && (
        <>
          {/* Caixa-resumo acima do histograma */}
          <Card>
            {hist.amostras === 0
              ? <p className="text-sm text-[#7a8099] text-center py-4">Nenhuma vaga com salário informado para estes filtros.</p>
              : <div className="flex items-center justify-center gap-0">
                  <div className="flex-1 text-center py-2">
                    <p className="text-[11px] uppercase tracking-widest text-[#7a8099] mb-1">Mínima</p>
                    <p className="text-2xl font-semibold text-[#4f8cff]">{fmt(hist.minimo)}</p>
                  </div>
                  <div className="flex-1 text-center py-2">
                    <p className="text-[11px] uppercase tracking-widest text-[#7a8099] mb-1">Média</p>
                    <p className="text-2xl font-semibold text-[#00e5a0]">{fmt(hist.media)}</p>
                  </div>
                  <div className="flex-1 text-center py-2">
                    <p className="text-[11px] uppercase tracking-widest text-[#7a8099] mb-1">Máxima</p>
                    <p className="text-2xl font-semibold text-[#f5a623]">{fmt(hist.maximo)}</p>
                  </div>
                </div>
            }
          </Card>

          {/* Histograma sem título */}
          <Card>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hist.histograma} margin={{ left: -10 }}>
                <XAxis dataKey="label" tick={{ fill:"#7a8099", fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#7a8099", fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }}
                  labelStyle={{ color:"#e8eaf0" }}
                  itemStyle={{ color:"#e8eaf0" }}
                  formatter={(value: number) => [`${value} vagas`, "Quantidade"]}
                  labelFormatter={(l: string) => `Faixa: ${l}`}
                />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {hist.histograma.map((_, i) => (
                    <Cell key={i} fill="#00e5a0" fillOpacity={0.5 + (i / hist.histograma.length) * 0.5} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  )
}


function WordCloud({ skills, ordem, cor1, cor2 }: {
  skills: { skill: string; count: number }[]
  ordem: "mais" | "menos"
  cor1: string
  cor2: string
}) {
  const sorted = [...skills]
    .sort((a, b) => ordem === "mais" ? b.count - a.count : a.count - b.count)
    .slice(0, 30)
  const max = sorted[0]?.count || 1
  const min = sorted[sorted.length - 1]?.count || 1

  return (
    <div className="flex flex-wrap gap-3 items-center justify-center py-4 px-2" style={{ minHeight: 200 }}>
      {sorted.map(s => {
        const pct = max === min ? 0.5 : (s.count - min) / (max - min)
        const size = Math.round(12 + pct * 28)
        const opacity = 0.4 + pct * 0.6
        const color = pct > 0.5 ? cor1 : cor2
        return (
          <span key={s.skill} title={`${s.count} vagas`}
            style={{ fontSize: size, color, opacity, fontFamily: "monospace", cursor: "default", transition: "opacity 0.2s" }}
            className="hover:opacity-100">
            {s.skill}
          </span>
        )
      })}
    </div>
  )
}

function SecaoHabilidades() {
  const [data, setData]         = useState<Habilidades | null>(null)
  const [dataSoft, setDataSoft] = useState<Habilidades | null>(null)
  const [loading, setLoading]   = useState(true)
  const [categoria, setCategoria] = useState("")
  const [ordem, setOrdem]       = useState<"mais"|"menos">("mais")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tipo: "hard" })
    if (categoria) params.set("categoria", categoria)
    const paramsSoft = new URLSearchParams({ tipo: "soft" })
    if (categoria) paramsSoft.set("categoria", categoria)

    const [resHard, resSoft] = await Promise.all([
      fetch(`/api/habilidades?${params}`).then(r => r.json()),
      fetch(`/api/habilidades?${paramsSoft}`).then(r => r.json()),
    ])
    setData(resHard)
    setDataSoft(resSoft)
    setLoading(false)
  }, [categoria])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <Card>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <FiltroSelect label="Setor" options={CATEGORIAS} value={categoria} onChange={setCategoria} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7a8099] uppercase tracking-wider">Ordem:</span>
            <select value={ordem} onChange={e => setOrdem(e.target.value as "mais"|"menos")}
              className="bg-[#1c2028] border border-[#2a2e38] rounded px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#00e5a0]">
              <option value="mais">Mais procuradas</option>
              <option value="menos">Menos procuradas</option>
            </select>
          </div>
          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      {loading ? <Loading /> : (
        <>
          <Card>
            <CardTitle>Habilidades Técnicas (Hard Skill)</CardTitle>
            {data && data.topSkills.length > 0
              ? <WordCloud skills={data.topSkills} ordem={ordem} cor1="#00e5a0" cor2="#4f8cff" />
              : <p className="text-sm text-[#7a8099] py-8 text-center">Nenhuma habilidade encontrada.</p>
            }
          </Card>

          <Card>
            <CardTitle>Habilidades Interpessoais (Soft Skill)</CardTitle>
            {dataSoft && dataSoft.topSkills.length > 0
              ? <WordCloud skills={dataSoft.topSkills} ordem={ordem} cor1="#a78bfa" cor2="#f5a623" />
              : <p className="text-sm text-[#7a8099] py-8 text-center">Nenhuma habilidade encontrada.</p>
            }
          </Card>
        </>
      )}
    </div>
  )
}


// ─── Seção Empresas ───────────────────────────────────────

interface Empresas {
  maisVagas:  { empresa: string; total: number; salarioMedio: number | null }[]
  menosVagas: { empresa: string; total: number }[]
  maisPagam:  { empresa: string; salarioMedio: number | null; total: number }[]
  menosPagam: { empresa: string; salarioMedio: number | null; total: number }[]
}

function SecaoEmpresas() {
  const [data, setData]       = useState<Empresas | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState("")
  const [estado, setEstado]       = useState("")
  const [ordem, setOrdem]         = useState<"mais-vagas"|"menos-vagas"|"mais-pagam"|"menos-pagam">("mais-vagas")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoria) params.set("categoria", categoria)
    if (estado)    params.set("estado", estado)
    const res = await fetch(`/api/empresas?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [categoria, estado])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <Loading />
  if (!data)   return null

  const lista = ordem === "mais-vagas"   ? data.maisVagas
              : ordem === "menos-vagas"  ? data.menosVagas
              : ordem === "mais-pagam"   ? data.maisPagam
              : data.menosPagam

  const maxVal = Math.max(...(lista as {total?:number;salarioMedio?:number|null}[]).map(e => (ordem.includes("pagam") ? (e as {salarioMedio:number|null}).salarioMedio || 0 : (e as {total:number}).total) ), 1)

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Filtros</CardTitle>
        <div className="flex flex-wrap gap-4">
          <FiltroSelect label="Setor"   options={CATEGORIAS} value={categoria} onChange={setCategoria} />
          <FiltroSelect label="Estado" options={ESTADOS}    value={estado}    onChange={setEstado}    />
          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { id: "mais-vagas",   label: "Mais vagas"    },
            { id: "menos-vagas",  label: "Menos vagas"   },
            { id: "mais-pagam",   label: "Mais pagam"    },
            { id: "menos-pagam",  label: "Menos pagam"   },
          ] as {id: typeof ordem; label: string}[]).map(o => (
            <button key={o.id} onClick={() => setOrdem(o.id)}
              className={`rounded px-3 py-1 text-xs border transition ${ordem === o.id ? "border-[#00e5a0] text-[#00e5a0] bg-[#00e5a0]/10" : "border-[#2a2e38] text-[#7a8099]"}`}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {lista.map((e, i) => {
            const val = ordem.includes("pagam") ? (e as {salarioMedio:number|null}).salarioMedio || 0 : (e as {total:number}).total
            const extra = ordem.includes("pagam") ? fmt((e as {salarioMedio:number|null}).salarioMedio) : `${(e as {total:number}).total} vagas`
            return (
              <div key={e.empresa} className="flex items-center gap-3">
                <span className="w-4 font-mono text-[11px] text-[#7a8099]">{i+1}</span>
                <span className="w-48 flex-shrink-0 truncate text-sm">{e.empresa}</span>
                <div className="h-1.5 flex-1 rounded bg-[#1c2028]">
                  <div className="h-1.5 rounded transition-all duration-700"
                    style={{ width:`${Math.round(val/maxVal*100)}%`, background: ordem.includes("mais")?"#00e5a0":"#ff6b6b" }}/>
                </div>
                <span className="w-24 text-right font-mono text-[11px] text-[#7a8099]">{extra}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Mais vagas</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.maisVagas.slice(0,8)} layout="vertical" margin={{ left:10 }}>
              <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="empresa" tick={{ fill:"#e8eaf0", fontSize:10 }} axisLine={false} tickLine={false} width={120} tickFormatter={(v:string)=>v.slice(0,15)}/>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }}/>
              <Bar dataKey="total" fill="#00e5a0" fillOpacity={0.8} radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Que mais pagam</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.maisPagam.slice(0,8)} layout="vertical" margin={{ left:10 }}>
              <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`}/>
              <YAxis type="category" dataKey="empresa" tick={{ fill:"#e8eaf0", fontSize:10 }} axisLine={false} tickLine={false} width={120} tickFormatter={(v:string)=>v.slice(0,15)}/>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }} formatter={(v:number)=>[fmt(v)]}/>
              <Bar dataKey="salarioMedio" fill="#f5a623" fillOpacity={0.8} radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────

export default function Home() {
  const [secao, setSecao] = useState<Secao>("visao-geral")
  const [visaoGeral, setVisaoGeral] = useState<VisaoGeral | null>(null)
  const [loadingVG, setLoadingVG] = useState(true)

  useEffect(() => {
    fetch("/api/visao-geral")
      .then(r => r.json())
      .then(d => { setVisaoGeral(d); setLoadingVG(false) })
  }, [])

  const secoes: { id: Secao; label: string }[] = [
    { id: "visao-geral",   label: "Visão Geral"  },
    { id: "setores",       label: "Setores"      },
    { id: "localidade",    label: "Localidade"   },
    { id: "salarios",      label: "Salário"      },
    { id: "habilidades",   label: "Habilidades"  },
  ]

  return (
    <main className="min-h-screen bg-[#0d0f12] text-[#e8eaf0] font-sans">

      {/* Cabeçalho — reservado para uso futuro */}
      <header className="border-b border-[#2a2e38] bg-[#0d0f12] px-8 py-4" />

      {/* Navegação */}
      <div className="sticky top-0 z-10 border-b border-[#2a2e38] bg-[#0d0f12] px-8">
        <div className="flex items-center">
          <div className="w-28 flex-shrink-0" />
          <div className="flex flex-1 justify-center gap-1">
            {secoes.map(s => (
              <button key={s.id} onClick={() => setSecao(s.id)}
                className={`px-5 py-3 text-sm transition border-b-2 -mb-px ${secao === s.id ? "border-[#00e5a0] text-[#00e5a0]" : "border-transparent text-[#7a8099] hover:text-[#e8eaf0]"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="w-28 flex-shrink-0 flex justify-end">
            <button onClick={() => {
              setLoadingVG(true)
              fetch("/api/visao-geral").then(r => r.json()).then(d => { setVisaoGeral(d); setLoadingVG(false) })
            }} className="rounded border border-[#2a2e38] px-3 py-1.5 text-xs text-[#7a8099] hover:border-[#00e5a0] hover:text-[#00e5a0] transition">
              ↻ Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {secao === "visao-geral" && <div className="py-24 text-center text-[#7a8099] text-sm">Em branco — reservado para uso futuro.</div>}
        {secao === "setores"     && <SecaoSetores />}
        {secao === "localidade"  && <SecaoLocalidade />}
        {secao === "salarios"    && <SecaoSalarios />}
        {secao === "habilidades" && <SecaoHabilidades />}
      </div>

      {/* Rodapé — reservado para uso futuro */}
      <footer className="border-t border-[#2a2e38] bg-[#0d0f12] py-4" />
    </main>
  )
}
