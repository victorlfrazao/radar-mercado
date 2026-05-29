import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Total de vagas
    const totalVagas = await prisma.vagas.count()

    // Por categoria
    const porCategoria = await prisma.vagas.groupBy({
      by: ["categoria"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    })

    // Por estado (top 6)
    const porEstado = await prisma.vagas.groupBy({
      by: ["estado"],
      _count: { id: true },
      where: { estado: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    })

    // Salário médio geral
    const salario = await prisma.vagas.aggregate({
      _avg: { salario_min: true, salario_max: true },
      where: { salario_min: { not: null } },
    })

    // Top 5 empresas
    const topEmpresas = await prisma.vagas.groupBy({
      by: ["empresa"],
      _count: { id: true },
      where: { empresa: { not: "Não informado" } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    })

    // Top hard skills
    const vagasComSkills = await prisma.vagas.findMany({
      select: { hard_skills: true },
      where: { hard_skills: { isEmpty: false } },
    })
    const hardSkillCount: Record<string, number> = {}
    vagasComSkills.forEach(v => {
      v.hard_skills.forEach(s => {
        hardSkillCount[s] = (hardSkillCount[s] || 0) + 1
      })
    })
    const topHardSkills = Object.entries(hardSkillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }))

    // Top soft skills
    const vagasComSoft = await prisma.vagas.findMany({
      select: { soft_skills: true },
      where: { soft_skills: { isEmpty: false } },
    })
    const softSkillCount: Record<string, number> = {}
    vagasComSoft.forEach(v => {
      v.soft_skills.forEach(s => {
        softSkillCount[s] = (softSkillCount[s] || 0) + 1
      })
    })
    const topSoftSkills = Object.entries(softSkillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }))

    return NextResponse.json({
      totalVagas,
      porCategoria: porCategoria.map(c => ({
        categoria: c.categoria || "Outros",
        total: c._count.id,
      })),
      porEstado: porEstado.map(e => ({
        estado: e.estado,
        total: e._count.id,
      })),
      salarioMedio: salario._avg.salario_min
        ? Math.round((salario._avg.salario_min! + (salario._avg.salario_max || salario._avg.salario_min!)) / 2)
        : null,
      topEmpresas: topEmpresas.map(e => ({
        empresa: e.empresa,
        total: e._count.id,
      })),
      topHardSkills,
      topSoftSkills,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
