import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const estado    = searchParams.get("estado")    || undefined
  const empresa   = searchParams.get("empresa")   || undefined
  const salMin    = searchParams.get("salMin")     ? Number(searchParams.get("salMin"))    : undefined
  const salMax    = searchParams.get("salMax")     ? Number(searchParams.get("salMax"))    : undefined
  const skill     = searchParams.get("skill")      || undefined

  try {
    const where: Record<string, unknown> = {}
    if (estado)  where.estado  = estado
    if (empresa) where.empresa_canonical = { contains: empresa.toLowerCase() }
    if (salMin)  where.salario_min = { gte: salMin }
    if (salMax)  where.salario_max = { lte: salMax }
    if (skill)   where.hard_skills = { has: skill }

    const porCategoria = await prisma.vagas.groupBy({
      by: ["categoria"],
      _count: { id: true },
      _avg: { salario_min: true, salario_max: true },
      where,
      orderBy: { _count: { id: "desc" } },
    })

    const porNivel = await prisma.vagas.groupBy({
      by: ["nivel_experiencia"],
      _count: { id: true },
      where,
      orderBy: { _count: { id: "desc" } },
    })

    const porModalidade = await prisma.vagas.groupBy({
      by: ["modalidade"],
      _count: { id: true },
      where,
      orderBy: { _count: { id: "desc" } },
    })

    const porContrato = await prisma.vagas.groupBy({
      by: ["tipo_contrato"],
      _count: { id: true },
      where: { ...where, tipo_contrato: { not: "" } },
      orderBy: { _count: { id: "desc" } },
    })

    return NextResponse.json({
      porCategoria: porCategoria.map(c => ({
        categoria: c.categoria || "Outros",
        total: c._count.id,
        salarioMedio: c._avg.salario_min
          ? Math.round((c._avg.salario_min! + (c._avg.salario_max || c._avg.salario_min!)) / 2)
          : null,
      })),
      porNivel: porNivel.map(n => ({
        nivel: n.nivel_experiencia || "Não informado",
        total: n._count.id,
      })),
      porModalidade: porModalidade.map(m => ({
        modalidade: m.modalidade || "Presencial",
        total: m._count.id,
      })),
      porContrato: porContrato.map(c => ({
        contrato: c.tipo_contrato,
        total: c._count.id,
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
