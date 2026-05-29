import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const categoria = searchParams.get("categoria") || undefined
  const empresa   = searchParams.get("empresa")   || undefined
  const salMin    = searchParams.get("salMin")     ? Number(searchParams.get("salMin")) : undefined
  const skill     = searchParams.get("skill")      || undefined

  try {
    const where: Record<string, unknown> = { estado: { not: null } }
    if (categoria) where.categoria = categoria
    if (empresa)   where.empresa_canonical = { contains: empresa.toLowerCase() }
    if (salMin)    where.salario_min = { gte: salMin }
    if (skill)     where.hard_skills = { has: skill }

    // Por estado
    const porEstado = await prisma.vagas.groupBy({
      by: ["estado", "regiao"],
      _count: { id: true },
      _avg: { salario_min: true },
      where,
      orderBy: { _count: { id: "desc" } },
    })

    // Por região
    const porRegiao = await prisma.vagas.groupBy({
      by: ["regiao"],
      _count: { id: true },
      where: { ...where, regiao: { not: "" } },
      orderBy: { _count: { id: "desc" } },
    })

    // Por cidade (top 10)
    const porCidade = await prisma.vagas.groupBy({
      by: ["cidade", "estado"],
      _count: { id: true },
      where: { ...where, cidade: { not: "" } },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    })

    // Vagas com coordenadas para mapa
    const comCoordenadas = await prisma.vagas.findMany({
      select: {
        latitude: true,
        longitude: true,
        cidade: true,
        estado: true,
        categoria: true,
      },
      where: {
        ...where,
        latitude: { not: null },
        longitude: { not: null },
      },
      take: 500,
    })

    return NextResponse.json({
      porEstado: porEstado.map(e => ({
        estado: e.estado,
        regiao: e.regiao,
        total: e._count.id,
        salarioMedio: e._avg.salario_min ? Math.round(e._avg.salario_min) : null,
      })),
      porRegiao: porRegiao.map(r => ({
        regiao: r.regiao || "Não informado",
        total: r._count.id,
      })),
      porCidade: porCidade.map(c => ({
        cidade: c.cidade,
        estado: c.estado,
        total: c._count.id,
      })),
      pontosMapa: comCoordenadas,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
