import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const categoria = searchParams.get("categoria") || undefined
  const estado    = searchParams.get("estado")    || undefined
  const salMin    = searchParams.get("salMin")     ? Number(searchParams.get("salMin")) : undefined
  const skill     = searchParams.get("skill")      || undefined

  try {
    const where: Record<string, unknown> = { empresa: { not: "Não informado" } }
    if (categoria) where.categoria    = categoria
    if (estado)    where.estado       = estado
    if (salMin)    where.salario_min  = { gte: salMin }
    if (skill)     where.hard_skills  = { has: skill }

    const maisVagas = await prisma.vagas.groupBy({
      by: ["empresa"], _count: { id: true }, _avg: { salario_min: true },
      where, orderBy: { _count: { id: "desc" } }, take: 15,
    })
    const menosVagas = await prisma.vagas.groupBy({
      by: ["empresa"], _count: { id: true },
      where, orderBy: { _count: { id: "asc" } }, take: 10,
    })
    const maisPagam = await prisma.vagas.groupBy({
      by: ["empresa"], _avg: { salario_min: true }, _count: { id: true },
      where: { ...where, salario_min: { not: null, gt: 0 } },
      having: { salario_min: { _avg: { gt: 0 } } },
      orderBy: { _avg: { salario_min: "desc" } }, take: 10,
    })
    const menosPagam = await prisma.vagas.groupBy({
      by: ["empresa"], _avg: { salario_min: true }, _count: { id: true },
      where: { ...where, salario_min: { not: null, gt: 0 } },
      having: { salario_min: { _avg: { gt: 0 } } },
      orderBy: { _avg: { salario_min: "asc" } }, take: 10,
    })

    return NextResponse.json({
      maisVagas:  maisVagas.map(e => ({ empresa: e.empresa, total: e._count.id, salarioMedio: e._avg.salario_min ? Math.round(e._avg.salario_min) : null })),
      menosVagas: menosVagas.map(e => ({ empresa: e.empresa, total: e._count.id })),
      maisPagam:  maisPagam.map(e => ({ empresa: e.empresa, salarioMedio: e._avg.salario_min ? Math.round(e._avg.salario_min) : null, total: e._count.id })),
      menosPagam: menosPagam.map(e => ({ empresa: e.empresa, salarioMedio: e._avg.salario_min ? Math.round(e._avg.salario_min) : null, total: e._count.id })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
