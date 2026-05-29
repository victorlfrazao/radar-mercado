import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const categoria = searchParams.get("categoria") || undefined
  const empresa   = searchParams.get("empresa")   || undefined
  const skill     = searchParams.get("skill")      || undefined

  try {
    const where: Record<string, unknown> = {
      salario_min: { not: null, gt: 0 },
      salario_previsto: false,
    }
    if (categoria) where.categoria = categoria
    if (empresa)   where.empresa_canonical = { contains: empresa.toLowerCase() }
    if (skill)     where.hard_skills = { has: skill }

    // Médias por categoria
    const porCategoria = await prisma.vagas.groupBy({
      by: ["categoria"],
      _avg: { salario_min: true, salario_max: true },
      _min: { salario_min: true },
      _max: { salario_max: true },
      _count: { id: true },
      where,
      orderBy: { _avg: { salario_min: "desc" } },
    })

    // Médias por nível de experiência
    const porNivel = await prisma.vagas.groupBy({
      by: ["nivel_experiencia"],
      _avg: { salario_min: true, salario_max: true },
      _count: { id: true },
      where: { ...where, nivel_experiencia: { not: "Não informado" } },
      orderBy: { _avg: { salario_min: "desc" } },
    })

    // Médias por estado (top 8)
    const porEstado = await prisma.vagas.groupBy({
      by: ["estado"],
      _avg: { salario_min: true },
      _count: { id: true },
      where: { ...where, estado: { not: null } },
      orderBy: { _avg: { salario_min: "desc" } },
      take: 8,
    })

    // Médias por modalidade
    const porModalidade = await prisma.vagas.groupBy({
      by: ["modalidade"],
      _avg: { salario_min: true, salario_max: true },
      _count: { id: true },
      where,
      orderBy: { _avg: { salario_min: "desc" } },
    })

    // Top empresas que mais pagam
    const topEmpresas = await prisma.vagas.groupBy({
      by: ["empresa"],
      _avg: { salario_min: true },
      _count: { id: true },
      where: { ...where, empresa: { not: "Não informado" } },
      having: { salario_min: { _avg: { gt: 0 } } },
      orderBy: { _avg: { salario_min: "desc" } },
      take: 8,
    })

    // Geral
    const geral = await prisma.vagas.aggregate({
      _avg: { salario_min: true, salario_max: true },
      _min: { salario_min: true },
      _max: { salario_max: true },
      _count: { id: true },
      where,
    })

    return NextResponse.json({
      geral: {
        media: geral._avg.salario_min ? Math.round(geral._avg.salario_min) : null,
        minimo: geral._min.salario_min,
        maximo: geral._max.salario_max,
        amostras: geral._count.id,
      },
      porCategoria: porCategoria.map(c => ({
        categoria: c.categoria || "Outros",
        media: c._avg.salario_min ? Math.round(c._avg.salario_min) : null,
        mediaMax: c._avg.salario_max ? Math.round(c._avg.salario_max) : null,
        minimo: c._min.salario_min,
        maximo: c._max.salario_max,
        amostras: c._count.id,
      })),
      porNivel: porNivel.map(n => ({
        nivel: n.nivel_experiencia,
        media: n._avg.salario_min ? Math.round(n._avg.salario_min) : null,
        amostras: n._count.id,
      })),
      porEstado: porEstado.map(e => ({
        estado: e.estado,
        media: e._avg.salario_min ? Math.round(e._avg.salario_min) : null,
        amostras: e._count.id,
      })),
      porModalidade: porModalidade.map(m => ({
        modalidade: m.modalidade,
        media: m._avg.salario_min ? Math.round(m._avg.salario_min) : null,
        amostras: m._count.id,
      })),
      topEmpresas: topEmpresas.map(e => ({
        empresa: e.empresa,
        media: e._avg.salario_min ? Math.round(e._avg.salario_min) : null,
        amostras: e._count.id,
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
