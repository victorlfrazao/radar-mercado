import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const categoria = searchParams.get("categoria") || undefined
  const estado    = searchParams.get("estado")    || undefined
  const empresa   = searchParams.get("empresa")   || undefined
  const skill     = searchParams.get("skill")      || undefined

  try {
    const where: Record<string, unknown> = {
      salario_min: { not: null, gt: 100 },
      salario_previsto: false,
    }
    if (categoria) where.categoria       = categoria
    if (estado)    where.estado          = estado
    if (empresa)   where.empresa_canonical = { contains: empresa.toLowerCase() }
    if (skill)     where.hard_skills     = { has: skill }

    const vagas = await prisma.vagas.findMany({
      select: { salario_min: true, salario_max: true },
      where,
    })

    // Monta histograma em faixas de R$2.000
    const faixas: Record<number, number> = {}
    let soma = 0, min = Infinity, max = 0

    vagas.forEach(v => {
      const sal = v.salario_min!
      soma += sal
      if (sal < min) min = sal
      if (sal > max) max = sal
      const faixa = Math.floor(sal / 2000) * 2000
      faixas[faixa] = (faixas[faixa] || 0) + 1
    })

    const histograma = Object.entries(faixas)
      .map(([faixa, count]) => ({
        faixa: Number(faixa),
        label: `R$${(Number(faixa)/1000).toFixed(0)}k`,
        count,
      }))
      .sort((a, b) => a.faixa - b.faixa)

    return NextResponse.json({
      histograma,
      media:   vagas.length ? Math.round(soma / vagas.length) : null,
      minimo:  min === Infinity ? null : Math.round(min),
      maximo:  max === 0 ? null : Math.round(max),
      amostras: vagas.length,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
