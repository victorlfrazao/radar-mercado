import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const categoria = searchParams.get("categoria") || undefined
  const empresa   = searchParams.get("empresa")   || undefined
  const salMin    = searchParams.get("salMin")     ? Number(searchParams.get("salMin")) : undefined
  const salMax    = searchParams.get("salMax")     ? Number(searchParams.get("salMax")) : undefined
  const tipo      = searchParams.get("tipo")       || "hard" // "hard" ou "soft"

  try {
    const where: Record<string, unknown> = {}
    if (categoria) where.categoria = categoria
    if (empresa)   where.empresa_canonical = { contains: empresa.toLowerCase() }
    if (salMin)    where.salario_min = { gte: salMin }
    if (salMax)    where.salario_max = { lte: salMax }

    const campo = tipo === "soft" ? "soft_skills" : "hard_skills"

    const vagas = await prisma.vagas.findMany({
      select: {
        [campo]: true,
        categoria: true,
        salario_min: true,
      },
      where: {
        ...where,
        [campo]: { isEmpty: false },
      },
    })

    // Conta ocorrências de cada skill
    const skillCount: Record<string, number> = {}
    const skillSalario: Record<string, number[]> = {}

    vagas.forEach(v => {
      const skills = (v as Record<string, unknown>)[campo] as string[]
      skills.forEach(s => {
        skillCount[s] = (skillCount[s] || 0) + 1
        if (v.salario_min) {
          if (!skillSalario[s]) skillSalario[s] = []
          skillSalario[s].push(v.salario_min)
        }
      })
    })

    const skills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .map(([skill, count]) => ({
        skill,
        count,
        salarioMedio: skillSalario[skill]?.length
          ? Math.round(skillSalario[skill].reduce((a, b) => a + b, 0) / skillSalario[skill].length)
          : null,
      }))

    // Skills por categoria
    const porCategoria: Record<string, Record<string, number>> = {}
    vagas.forEach(v => {
      const cat = v.categoria || "Outros"
      const skills = (v as Record<string, unknown>)[campo] as string[]
      if (!porCategoria[cat]) porCategoria[cat] = {}
      skills.forEach(s => {
        porCategoria[cat][s] = (porCategoria[cat][s] || 0) + 1
      })
    })

    const skillsPorCategoria = Object.entries(porCategoria).map(([cat, skills]) => ({
      categoria: cat,
      topSkills: Object.entries(skills)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([skill, count]) => ({ skill, count })),
    }))

    return NextResponse.json({
      tipo,
      total: skills.length,
      topSkills: skills.slice(0, 20),
      menosRequisitadas: skills.slice(-10).reverse(),
      skillsPorCategoria,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
