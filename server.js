const http = require("http");
const https = require("https");

const APP_ID = "90acff5c";
const APP_KEY = "36749ef4afed2e19ac5ad91d3acc65bf";

// Categorias oficiais da Adzuna BR — buscadas pela tag (mais preciso que keyword)
const SEARCHES = [
  // Tecnologia
  { label: "TI / Tecnologia",        category: "it-jobs",                      area: "tech"    },
  { label: "Engenharia",             category: "engineering-jobs",             area: "tech"    },
  { label: "Ciência e QA",           category: "scientific-qa-jobs",           area: "tech"    },
  { label: "Criação e Design",       category: "creative-design-jobs",         area: "tech"    },
  // Humanas / Negócios
  { label: "Contabilidade",          category: "accounting-finance-jobs",      area: "humanas" },
  { label: "Vendas",                 category: "sales-jobs",                   area: "humanas" },
  { label: "Recursos Humanos",       category: "hr-jobs",                      area: "humanas" },
  { label: "Jurídico",               category: "legal-jobs",                   area: "humanas" },
  { label: "Marketing",              category: "pr-advertising-marketing-jobs",area: "humanas" },
  { label: "Administrativo",         category: "admin-jobs",                   area: "humanas" },
  { label: "Consultoria",            category: "consultancy-jobs",             area: "humanas" },
  { label: "Ensino",                 category: "teaching-jobs",                area: "humanas" },
  // Saúde / Outros
  { label: "Saúde",                  category: "healthcare-nursing-jobs",      area: "saude"   },
  { label: "Logística",              category: "logistics-warehouse-jobs",     area: "outros"  },
  { label: "Construção",             category: "trade-construction-jobs",      area: "outros"  },
  { label: "Varejo",                 category: "retail-jobs",                  area: "outros"  },
  { label: "Industrial",             category: "manufacturing-jobs",           area: "outros"  },
  { label: "Atendimento",            category: "customer-services-jobs",       area: "outros"  },
];

const SKILL_KEYWORDS = [
  "Python","SQL","AWS","React","Java","Node.js","Docker","Kubernetes",
  "TypeScript","Power BI","Azure","GCP","Spark","dbt","Airflow",
  "Tableau","Git","JavaScript","C#","Go","Terraform",
  "Kafka","MongoDB","PostgreSQL","FastAPI","LangChain",
  "Pandas","TensorFlow","PyTorch","scikit-learn","Excel","Linux",
];

function adzunaGet(path) {
  return new Promise((resolve, reject) => {
    const url = `https://api.adzuna.com/v1/api/jobs/br/${path}&app_id=${APP_ID}&app_key=${APP_KEY}&content-type=application/json`;
    console.log("  GET", url.split("?")[0]);
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function buildPayload() {
  console.log("\n📡 Iniciando coleta de dados...\n");

  // 1. Vagas por área
  const areaResults = await Promise.all(
    SEARCHES.map(async (s) => {
      try {
        const r = await adzunaGet(`search/1?results_per_page=50&category=${encodeURIComponent(s.category)}`);
        return { label: s.label, category: s.category, area: s.area, count: r.count || 0, jobs: r.results || [] };
      } catch {
        return { label: s.label, category: s.category, area: s.area, count: 0, jobs: [] };
      }
    })
  );

  // 2. Histograma de salários (por área)
  const histogramas = await Promise.all(
    SEARCHES.map(async (s) => {
      try {
        const r = await adzunaGet(`histogram?category=${encodeURIComponent(s.category)}`);
        const entries = Object.entries(r.histogram || {})
          .map(([k, v]) => ({ faixa: Number(k), count: Number(v) }))
          .filter(e => e.faixa >= 1000 && e.faixa <= 150000)
          .sort((a, b) => a.faixa - b.faixa);
        // Calcula salário médio ponderado pelo histograma
        const totalVagas = entries.reduce((s, e) => s + e.count, 0);
        const mediaPonderada = totalVagas > 0
          ? Math.round(entries.reduce((s, e) => s + e.faixa * e.count, 0) / totalVagas)
          : null;
        return { area: s.label, areaGroup: s.area, histogram: entries, mediaSalarial: mediaPonderada };
      } catch {
        return { area: s.label, areaGroup: s.area, histogram: [], mediaSalarial: null };
      }
    })
  );

  // 3. Top empresas que mais contratam
  const topEmpresas = await Promise.all(
    SEARCHES.slice(0, 6).map(async (s) => {
      try {
        const r = await adzunaGet(`top_companies?category=${encodeURIComponent(s.category)}`);
        const companies = (r.leaderboard || []).slice(0, 5).map((c) => ({
          name: c.canonical_name || c.display_name,
          count: c.count,
        }));
        return { area: s.label, companies };
      } catch {
        return { area: s.label, companies: [] };
      }
    })
  );

  // 4. Histórico de salários (últimos meses)
  let historicoSalario = [];
  try {
    const r = await adzunaGet(`history?what=developer&months=6`);
    historicoSalario = Object.entries(r.month || {})
      .map(([mes, valor]) => ({ mes, valor: Math.round(Number(valor)) }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  } catch { historicoSalario = []; }

  // 5. Categorias disponíveis
  let categorias = [];
  try {
    const r = await adzunaGet(`categories?`);
    categorias = (r.results || []).slice(0, 10).map((c) => ({
      label: c.label,
      tag: c.tag,
    }));
  } catch { categorias = []; }

  // ── Processamento ──────────────────────────────────────

  const totalVagas = areaResults.reduce((s, a) => s + a.count, 0);

  const maxArea = Math.max(...areaResults.map((a) => a.count), 1);
  const tendencias = [...areaResults]
    .sort((a, b) => b.count - a.count)
    .map((a) => ({ label: a.label, count: a.count, pct: Math.round((a.count / maxArea) * 100) }));

  const allJobs = areaResults.flatMap((a) => a.jobs);
  const allText = allJobs.map((j) => `${j.title || ""} ${j.description || ""}`.toLowerCase()).join(" ");

  const skillCounts = SKILL_KEYWORDS.map((sk) => {
    const re = new RegExp(`\\b${sk.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    return { skill: sk, count: (allText.match(re) || []).length };
  }).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

  const skillsEmAlta = skillCounts.slice(0, 12);
  const skillsMenosPedidas = skillCounts.slice(-5).reverse();

  const tituloCounts = {};
  allJobs.forEach((j) => {
    const t = (j.title || "").trim();
    if (t) tituloCounts[t] = (tituloCounts[t] || 0) + 1;
  });
  const vagasMaisFrequentes = Object.entries(tituloCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([title, count]) => ({ title, count }));
  const vagasMenosFrequentes = Object.entries(tituloCounts).filter(([, c]) => c === 1).slice(0, 10).map(([title, count]) => ({ title, count }));

  const stateCounts = {};
  allJobs.forEach((j) => {
    const state = (j.location?.display_name || "").split(",").pop()?.trim();
    if (state && state.length > 2) stateCounts[state] = (stateCounts[state] || 0) + 1;
  });
  const estados = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));

  // Salários diretos das vagas (quando informado)
  const salariosDirectos = areaResults.map((a) => {
    const com = a.jobs.filter((j) => j.salary_min && j.salary_max && j.salary_min > 100);
    if (!com.length) return null;
    const avg = com.reduce((s, j) => s + (j.salary_min + j.salary_max) / 2, 0) / com.length;
    return { area: a.label, salario: Math.round(avg), amostras: com.length, fonte: "direto" };
  }).filter(Boolean);

  // Salários via histograma (média ponderada) quando direto não disponível
  const salariosComHistograma = SEARCHES.map((s) => {
    const direto = salariosDirectos.find((d) => d.area === s.label);
    if (direto) return direto;
    const hist = histogramas.find((h) => h.area === s.label);
    if (hist && hist.mediaSalarial) {
      const total = hist.histogram.reduce((t, e) => t + e.count, 0);
      return { area: s.label, salario: hist.mediaSalarial, amostras: total, fonte: "histograma" };
    }
    return null;
  }).filter(Boolean).sort((a, b) => b.salario - a.salario);

  const mediasHistograma = histogramas.map(h => h.mediaSalarial).filter((v) => v !== null);
  const salarioGeral = salariosComHistograma.length > 0
    ? Math.round(salariosComHistograma.reduce((s, r) => s + r.salario, 0) / salariosComHistograma.length)
    : mediasHistograma.length > 0
      ? Math.round(mediasHistograma.reduce((a, b) => a + b, 0) / mediasHistograma.length)
      : null;

  const palavrasChave = {};
  allJobs.forEach((j) => {
    (j.title || "").toLowerCase().split(/\s+/).forEach((w) => {
      if (w.length > 3) palavrasChave[w] = (palavrasChave[w] || 0) + 1;
    });
  });
  const topPalavras = Object.entries(palavrasChave).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([word, count]) => ({ word, count }));

  const pdiExport = {
    skills_em_alta: skillsEmAlta.slice(0, 5).map((s) => s.skill),
    areas_em_crescimento: tendencias.slice(0, 3).map((t) => t.label),
  };

  console.log(`\n✅ Coleta concluída: ${totalVagas} vagas\n`);

  return {
    totalVagas, tendencias, skillCounts: skillsEmAlta, skillsMenosPedidas,
    vagasMaisFrequentes, vagasMenosFrequentes, estados, salarios: salariosComHistograma, salarioGeral,
    topPalavras, histogramas, topEmpresas, historicoSalario, categorias, pdiExport,
    coletadoEm: new Date().toISOString(),
  };
}

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/api/mercado") {
    try {
      const now = Date.now();
      if (!cache || now - cacheTime > CACHE_TTL) {
        cache = await buildPayload();
        cacheTime = now;
      } else {
        console.log("Retornando cache.");
      }
      res.writeHead(200);
      res.end(JSON.stringify(cache));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.url === "/api/pdi") {
    if (!cache) { res.writeHead(503); res.end(JSON.stringify({ error: "Cache vazio. Acesse /api/mercado primeiro." })); return; }
    res.writeHead(200);
    res.end(JSON.stringify(cache.pdiExport));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(3001, () => {
  console.log("✅ Servidor Adzuna rodando em http://localhost:3001");
  console.log("📡 Mercado: http://localhost:3001/api/mercado");
  console.log("📦 PDI:     http://localhost:3001/api/pdi");
});