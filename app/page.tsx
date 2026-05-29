"use client"

import { useEffect, useState, useCallback } from "react"
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

type Secao = "visao-geral" | "areas" | "localizacao" | "salarios" | "habilidades"

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
  const maxCat = Math.max(...data.porCategoria.map(c => c.total), 1)
  const maxEst = Math.max(...data.porEstado.map(e => e.total), 1)
  const maxEmp = Math.max(...data.topEmpresas.map(e => e.total), 1)
  const maxHS  = Math.max(...data.topHardSkills.map(s => s.count), 1)
  const maxSS  = Math.max(...data.topSoftSkills.map(s => s.count), 1)

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-2 gap-px bg-[#2a2e38] rounded-xl overflow-hidden md:grid-cols-4">
        {[
          { label: "Total de vagas",   value: data.totalVagas.toLocaleString("pt-BR"),               color: "text-[#00e5a0]" },
          { label: "Áreas analisadas", value: String(data.porCategoria.length),                       color: "text-[#4f8cff]" },
          { label: "Salário médio",    value: fmt(data.salarioMedio),                                 color: "text-[#f5a623]" },
          { label: "Hard skills",      value: String(data.topHardSkills.length),                      color: "text-[#a78bfa]" },
        ].map(m => (
          <div key={m.label} className="bg-[#14171c] p-5">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-[#7a8099]">{m.label}</p>
            <p className={`text-3xl font-semibold tracking-tight ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Áreas */}
        <Card>
          <CardTitle>Áreas — resumo</CardTitle>
          {data.porCategoria.map(c => (
            <BarraHorizontal key={c.categoria} label={c.categoria} value={c.total} max={maxCat} />
          ))}
        </Card>

        {/* Gráfico pizza categorias */}
        <Card>
          <CardTitle>Distribuição por área</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.porCategoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={85} label={({ categoria }) => categoria}>
                {data.porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Localização */}
        <Card>
          <CardTitle>Localização — resumo</CardTitle>
          {data.porEstado.map(e => (
            <BarraHorizontal key={e.estado} label={e.estado} value={e.total} max={maxEst} cor="#4f8cff" />
          ))}
        </Card>

        {/* Empresas */}
        <Card>
          <CardTitle>Empresas — resumo</CardTitle>
          {data.topEmpresas.map(e => (
            <BarraHorizontal key={e.empresa} label={e.empresa || "N/D"} value={e.total} max={maxEmp} cor="#f5a623" />
          ))}
        </Card>

        {/* Hard Skills */}
        <Card>
          <CardTitle>Habilidades técnicas — resumo</CardTitle>
          <div className="flex flex-wrap gap-2">
            {data.topHardSkills.map((s, i) => (
              <span key={s.skill} className={`rounded px-2.5 py-1 font-mono text-xs border ${
                i === 0 ? "border-[#00e5a0]/30 bg-[#00e5a0]/10 text-[#00e5a0]"
                : i <= 2 ? "border-[#4f8cff]/25 bg-[#4f8cff]/10 text-[#4f8cff]"
                : "border-[#2a2e38] bg-[#1c2028] text-[#7a8099]"}`}>
                {s.skill} <span className="opacity-50">{s.count}</span>
              </span>
            ))}
          </div>
        </Card>

        {/* Soft Skills */}
        <Card>
          <CardTitle>Habilidades interpessoais — resumo</CardTitle>
          {data.topSoftSkills.map(s => (
            <BarraHorizontal key={s.skill} label={s.skill} value={s.count} max={maxSS} cor="#a78bfa" />
          ))}
        </Card>
      </div>
    </div>
  )
}

function SecaoAreas() {
  const [data, setData] = useState<Areas | null>(null)
  const [loading, setLoading] = useState(true)
  const [estado, setEstado] = useState("")
  const [salMin, setSalMin] = useState("")
  const [salMax, setSalMax] = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (estado) params.set("estado", estado)
    if (salMin) params.set("salMin", salMin)
    if (salMax) params.set("salMax", salMax)
    const res = await fetch(`/api/areas?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [estado, salMin, salMax])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <Loading />
  if (!data) return null

  const maxCat = Math.max(...data.porCategoria.map(c => c.total), 1)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardTitle>Filtros</CardTitle>
        <div className="flex flex-wrap gap-4">
          <FiltroSelect label="Estado" options={ESTADOS} value={estado} onChange={setEstado} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7a8099] uppercase tracking-wider">Salário:</span>
            <input placeholder="Mín" value={salMin} onChange={e => setSalMin(e.target.value)}
              className="w-24 bg-[#1c2028] border border-[#2a2e38] rounded px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#00e5a0]" />
            <span className="text-[#7a8099] text-xs">até</span>
            <input placeholder="Máx" value={salMax} onChange={e => setSalMax(e.target.value)}
              className="w-24 bg-[#1c2028] border border-[#2a2e38] rounded px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#00e5a0]" />
          </div>
          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Por categoria */}
        <Card>
          <CardTitle>Visão geral por categoria</CardTitle>
          {data.porCategoria.map(c => (
            <div key={c.categoria} className="mb-2.5">
              <BarraHorizontal label={c.categoria} value={c.total} max={maxCat}
                extra={`${c.total} vagas${c.salarioMedio ? ` · ${fmt(c.salarioMedio)}` : ""}`} />
            </div>
          ))}
        </Card>

        {/* Gráfico barras */}
        <Card>
          <CardTitle>Volume por categoria</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.porCategoria} margin={{ left: -20 }}>
              <XAxis dataKey="categoria" tick={{ fill:"#7a8099", fontSize:9 }} tickFormatter={(v:string)=>v.slice(0,6)} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }}/>
              <Bar dataKey="total" radius={[3,3,0,0]}>
                {data.porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.8}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Por nível */}
        <Card>
          <CardTitle>Por nível de experiência</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.porNivel} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="nivel" tick={{ fill:"#e8eaf0", fontSize:11 }} axisLine={false} tickLine={false} width={120}/>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }}/>
              <Bar dataKey="total" fill="#4f8cff" fillOpacity={0.8} radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Modalidade + Contrato */}
        <div className="space-y-4">
          <Card>
            <CardTitle>Por modalidade</CardTitle>
            {data.porModalidade.map(m => {
              const max = Math.max(...data.porModalidade.map(x => x.total), 1)
              return <BarraHorizontal key={m.modalidade} label={m.modalidade} value={m.total} max={max} cor="#f5a623" />
            })}
          </Card>
          <Card>
            <CardTitle>Por tipo de contrato</CardTitle>
            {data.porContrato.slice(0,4).map(c => {
              const max = Math.max(...data.porContrato.map(x => x.total), 1)
              return <BarraHorizontal key={c.contrato} label={c.contrato || "N/D"} value={c.total} max={max} cor="#a78bfa" />
            })}
          </Card>
        </div>
      </div>
    </div>
  )
}

function SecaoLocalizacao() {
  const [data, setData] = useState<Localizacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState("")
  const [salMin, setSalMin] = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoria) params.set("categoria", categoria)
    if (salMin) params.set("salMin", salMin)
    const res = await fetch(`/api/localizacao?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [categoria, salMin])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <Loading />
  if (!data) return null

  const maxEst = Math.max(...data.porEstado.map(e => e.total), 1)
  const maxReg = Math.max(...data.porRegiao.map(r => r.total), 1)
  const maxCid = Math.max(...data.porCidade.map(c => c.total), 1)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardTitle>Filtros</CardTitle>
        <div className="flex flex-wrap gap-4">
          <FiltroSelect label="Área" options={CATEGORIAS} value={categoria} onChange={setCategoria} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7a8099] uppercase tracking-wider">Salário mín:</span>
            <input placeholder="Ex: 3000" value={salMin} onChange={e => setSalMin(e.target.value)}
              className="w-28 bg-[#1c2028] border border-[#2a2e38] rounded px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#00e5a0]" />
          </div>
          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Por região */}
        <Card>
          <CardTitle>Por região</CardTitle>
          {data.porRegiao.map(r => (
            <BarraHorizontal key={r.regiao} label={r.regiao} value={r.total} max={maxReg} cor="#4f8cff" />
          ))}
        </Card>

        {/* Gráfico regiões */}
        <Card>
          <CardTitle>Distribuição regional</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.porRegiao} dataKey="total" nameKey="regiao" cx="50%" cy="50%" outerRadius={85} label={({ regiao }) => regiao}>
                {data.porRegiao.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Por estado */}
        <Card className="md:col-span-2">
          <CardTitle>Por estado</CardTitle>
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {data.porEstado.map(e => (
              <BarraHorizontal key={e.estado} label={`${e.estado} ${e.regiao ? `(${e.regiao})` : ""}`}
                value={e.total} max={maxEst} cor="#00e5a0"
                extra={`${e.total}${e.salarioMedio ? ` · ${fmt(e.salarioMedio)}` : ""}`} />
            ))}
          </div>
        </Card>

        {/* Top cidades */}
        <Card className="md:col-span-2">
          <CardTitle>Top 10 cidades</CardTitle>
          <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
            {data.porCidade.map(c => (
              <BarraHorizontal key={`${c.cidade}-${c.estado}`} label={`${c.cidade}, ${c.estado}`}
                value={c.total} max={maxCid} cor="#f5a623" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function SecaoSalarios() {
  const [data, setData] = useState<Salarios | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState("")
  const [skill, setSkill] = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoria) params.set("categoria", categoria)
    if (skill) params.set("skill", skill)
    const res = await fetch(`/api/salarios?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [categoria, skill])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <Loading />
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardTitle>Filtros</CardTitle>
        <div className="flex flex-wrap gap-4">
          <FiltroSelect label="Área" options={CATEGORIAS} value={categoria} onChange={setCategoria} />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7a8099] uppercase tracking-wider">Skill:</span>
            <input placeholder="Ex: python" value={skill} onChange={e => setSkill(e.target.value)}
              className="w-28 bg-[#1c2028] border border-[#2a2e38] rounded px-2 py-1 text-xs text-[#e8eaf0] focus:outline-none focus:border-[#00e5a0]" />
          </div>
          <button onClick={carregar} className="rounded border border-[#00e5a0] bg-[#00e5a0]/10 px-3 py-1 text-xs text-[#00e5a0] hover:bg-[#00e5a0]/20 transition">
            Aplicar
          </button>
        </div>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-px bg-[#2a2e38] rounded-xl overflow-hidden">
        <div className="bg-[#14171c] p-5">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-[#7a8099]">Salário médio</p>
          <p className="text-3xl font-semibold text-[#00e5a0]">{fmt(data.geral.media)}</p>
          <p className="text-[11px] text-[#7a8099] mt-1">{data.geral.amostras} vagas com salário</p>
        </div>
        <div className="bg-[#14171c] p-5">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-[#7a8099]">Menor salário</p>
          <p className="text-3xl font-semibold text-[#4f8cff]">{fmt(data.geral.minimo)}</p>
        </div>
        <div className="bg-[#14171c] p-5">
          <p className="mb-2 text-[11px] uppercase tracking-widest text-[#7a8099]">Maior salário</p>
          <p className="text-3xl font-semibold text-[#f5a623]">{fmt(data.geral.maximo)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Por categoria */}
        <Card>
          <CardTitle>Faixa salarial por área</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.porCategoria.filter(c => c.media)} margin={{ left: -10 }}>
              <XAxis dataKey="categoria" tick={{ fill:"#7a8099", fontSize:9 }} tickFormatter={(v:string)=>v.slice(0,6)} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }} formatter={(v:number)=>[fmt(v)]}/>
              <Legend wrapperStyle={{ fontSize:11, color:"#7a8099" }}/>
              <Bar dataKey="media" name="Mínimo médio" fill="#00e5a0" fillOpacity={0.8} radius={[3,3,0,0]}/>
              <Bar dataKey="mediaMax" name="Máximo médio" fill="#4f8cff" fillOpacity={0.8} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Por nível */}
        <Card>
          <CardTitle>Salário médio por nível</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.porNivel.filter(n => n.media)} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fill:"#7a8099", fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={(v:number)=>`${(v/1000).toFixed(0)}k`}/>
              <YAxis type="category" dataKey="nivel" tick={{ fill:"#e8eaf0", fontSize:10 }} axisLine={false} tickLine={false} width={120}/>
              <Tooltip contentStyle={{ background:"#1c2028", border:"1px solid #2a2e38", borderRadius:8, fontSize:12 }} formatter={(v:number)=>[fmt(v)]}/>
              <Bar dataKey="media" fill="#f5a623" fillOpacity={0.8} radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Por estado */}
        {data.porEstado.filter(e => e.media).length > 0 && (
          <Card>
            <CardTitle>Salário médio por estado</CardTitle>
            {data.porEstado.filter(e => e.media).map(e => {
              const max = Math.max(...data.porEstado.filter(x => x.media).map(x => x.media!), 1)
              return <BarraHorizontal key={e.estado} label={e.estado || "N/D"} value={e.media!} max={max} cor="#00e5a0" extra={fmt(e.media)} />
            })}
          </Card>
        )}

        {/* Top empresas que mais pagam */}
        {data.topEmpresas.filter(e => e.media).length > 0 && (
          <Card>
            <CardTitle>Empresas que mais pagam</CardTitle>
            {data.topEmpresas.filter(e => e.media).map(e => {
              const max = Math.max(...data.topEmpresas.filter(x => x.media).map(x => x.media!), 1)
              return <BarraHorizontal key={e.empresa} label={e.empresa || "N/D"} value={e.media!} max={max} cor="#a78bfa" extra={fmt(e.media)} />
            })}
          </Card>
        )}
      </div>
    </div>
  )
}

function SecaoHabilidades() {
  const [data, setData]     = useState<Habilidades | null>(null)
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo]     = useState<"hard"|"soft">("hard")
  const [categoria, setCategoria] = useState("")

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tipo })
    if (categoria) params.set("categoria", categoria)
    const res = await fetch(`/api/habilidades?${params}`)
    setData(await res.json())
    setLoading(false)
  }, [tipo, categoria])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <Loading />
  if (!data) return null

  const max = Math.max(...data.topSkills.map(s => s.count), 1)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardTitle>Filtros</CardTitle>
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <button onClick={() => setTipo("hard")} className={`rounded px-3 py-1 text-xs border transition ${tipo==="hard" ? "border-[#00e5a0] text-[#00e5a0] bg-[#00e5a0]/10" : "border-[#2a2e38] text-[#7a8099]"}`}>
              Hard Skills
            </button>
            <button onClick={() => setTipo("soft")} className={`rounded px-3 py-1 text-xs border transition ${tipo==="soft" ? "border-[#a78bfa] text-[#a78bfa] bg-[#a78bfa]/10" : "border-[#2a2e38] text-[#7a8099]"}`}>
              Soft Skills
            </button>
          </div>
          <FiltroSelect label="Área" options={CATEGORIAS} value={categoria} onChange={setCategoria} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Top skills */}
        <Card>
          <CardTitle>Mais requisitadas — {tipo === "hard" ? "técnicas" : "interpessoais"}</CardTitle>
          <div className="space-y-2">
            {data.topSkills.slice(0, 12).map((s, i) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="w-4 font-mono text-[11px] text-[#7a8099]">{i+1}</span>
                <span className="w-32 flex-shrink-0 font-mono text-sm">{s.skill}</span>
                <div className="h-1.5 flex-1 rounded bg-[#1c2028]">
                  <div className="h-1.5 rounded transition-all duration-700"
                    style={{ width:`${Math.round(s.count/max*100)}%`, background: tipo==="hard"?"#00e5a0":"#a78bfa" }} />
                </div>
                <span className="w-20 text-right font-mono text-[11px] text-[#7a8099]">
                  {s.count} vagas{s.salarioMedio ? ` · ${fmt(s.salarioMedio)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Menos requisitadas */}
        <Card>
          <CardTitle>Menos requisitadas</CardTitle>
          <div className="space-y-2">
            {data.menosRequisitadas.map(s => (
              <div key={s.skill} className="flex items-center justify-between rounded border border-[#2a2e38] bg-[#1c2028] px-3 py-2">
                <span className="font-mono text-sm">{s.skill}</span>
                <span className="font-mono text-xs text-[#ff6b6b] bg-[#ff6b6b]/10 px-2 py-0.5 rounded">{s.count}x</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tags */}
        <Card>
          <CardTitle>Todas as skills</CardTitle>
          <div className="flex flex-wrap gap-2">
            {data.topSkills.map((s, i) => (
              <span key={s.skill} className={`rounded px-2.5 py-1 font-mono text-xs border ${
                i===0 ? "border-[#00e5a0]/30 bg-[#00e5a0]/10 text-[#00e5a0]"
                : i<=2 ? "border-[#4f8cff]/25 bg-[#4f8cff]/10 text-[#4f8cff]"
                : i<=5 ? "border-[#f5a623]/25 bg-[#f5a623]/10 text-[#f5a623]"
                : "border-[#2a2e38] bg-[#1c2028] text-[#7a8099]"}`}>
                {s.skill} <span className="opacity-50">{s.count}</span>
              </span>
            ))}
          </div>
        </Card>

        {/* Skills por categoria */}
        <Card>
          <CardTitle>Skills por área</CardTitle>
          <div className="space-y-3">
            {data.skillsPorCategoria.slice(0,4).map(c => (
              <div key={c.categoria}>
                <p className="text-xs text-[#7a8099] mb-1">{c.categoria}</p>
                <div className="flex flex-wrap gap-1">
                  {c.topSkills.map(s => (
                    <span key={s.skill} className="rounded px-2 py-0.5 font-mono text-[11px] bg-[#1c2028] border border-[#2a2e38] text-[#7a8099]">
                      {s.skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
    { id: "areas",         label: "Áreas"        },
    { id: "localizacao",   label: "Localização"  },
    { id: "salarios",      label: "Salário"      },
    { id: "habilidades",   label: "Habilidades"  },
  ]

  return (
    <main className="min-h-screen bg-[#0d0f12] text-[#e8eaf0] font-sans">

      {/* Topbar */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a2e38] bg-[#0d0f12] px-8 py-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#00e5a0] shadow-[0_0_8px_#00e5a0]" />
          <span className="text-sm font-medium">Tendências de Mercado</span>
          <span className="rounded bg-[#00e5a0]/10 px-2 py-0.5 font-mono text-[11px] text-[#00e5a0] border border-[#00e5a0]/20">
            {visaoGeral ? `${visaoGeral.totalVagas.toLocaleString("pt-BR")} vagas` : "..."}
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#7a8099]">Adzuna API · PostgreSQL</span>
      </nav>

      {/* Navegação */}
      <div className="border-b border-[#2a2e38] px-8">
        <div className="flex gap-1">
          {secoes.map(s => (
            <button key={s.id} onClick={() => setSecao(s.id)}
              className={`px-5 py-3 text-sm transition border-b-2 -mb-px ${
                secao === s.id
                  ? "border-[#00e5a0] text-[#00e5a0]"
                  : "border-transparent text-[#7a8099] hover:text-[#e8eaf0]"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {secao === "visao-geral" && (loadingVG ? <Loading /> : visaoGeral && <SecaoVisaoGeral data={visaoGeral} />)}
        {secao === "areas"       && <SecaoAreas />}
        {secao === "localizacao" && <SecaoLocalizacao />}
        {secao === "salarios"    && <SecaoSalarios />}
        {secao === "habilidades" && <SecaoHabilidades />}
      </div>

      <footer className="border-t border-[#2a2e38] py-6 text-center font-mono text-[11px] text-[#7a8099]">
        Fonte: <span className="text-[#00e5a0]">Adzuna API</span> · Banco: <span className="text-[#4f8cff]">PostgreSQL</span> · Projeto acadêmico — sem fins comerciais
      </footer>
    </main>
  )
}
