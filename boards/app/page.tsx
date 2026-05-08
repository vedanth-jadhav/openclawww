"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Check, Database, FileSearch, Search, Settings, Sparkles } from "lucide-react";
import { Button, Input, Panel, Select } from "@/app/components/ui";
import { formatSeconds } from "@/app/lib/utils";

type Question = {
  id: string;
  subjectId: string;
  subjectName: string;
  chapterName: string;
  topicName: string | null;
  canonicalText: string;
  markdown: string;
  questionType: string;
  marks: number;
  difficulty: string;
  repeatCount: number;
  firstYear: number | null;
  lastYear: number | null;
  officialSolution: string | null;
  aiSolution: string | null;
  occurrences: Array<{
    id: string;
    year: number;
    questionNumber: string;
    originalText: string;
    wordingDelta: string | null;
    marks: number;
    setName: string;
    sourceUrl: string;
  }>;
};

type Trends = {
  totals: { questions: number; weightedRepeats: number; papers: number; repeatedClusters: number };
  chapters: Array<{ subject: string; chapter: string; questions: number; appearances: number }>;
  topClusters: Array<{ id: string; canonicalText: string; repeatCount: number; firstYear: number; lastYear: number; confidence: number }>;
  marksByYear: Array<{ year: number; marks: number; appearances: number }>;
  marksBreakdown: Array<{ marks: number; questions: number }>;
};

export default function Home() {
  const [tab, setTab] = useState<"dashboard" | "browse" | "practice" | "sources" | "settings">("dashboard");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [type, setType] = useState("all");
  const [marks, setMarks] = useState("all");

  useEffect(() => {
    fetch("/api/trends").then((response) => response.json()).then(setTrends);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ subject, type, marks });
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/questions?${params}`).then((response) => response.json()).then((data) => setQuestions(data.questions));
  }, [search, subject, type, marks]);

  const nav = [
    { id: "dashboard", label: "Trends", icon: BarChart3 },
    { id: "browse", label: "Browse", icon: BookOpen },
    { id: "practice", label: "Practice", icon: Check },
    { id: "sources", label: "Sources", icon: FileSearch },
    { id: "settings", label: "Settings", icon: Settings }
  ] as const;

  return (
    <main className="min-h-screen">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-[#EBEBEB] bg-white px-4 py-5 md:block">
        <div className="mb-8 flex items-center gap-2 text-[18px] font-semibold">
          <Database size={18} />
          Boards
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex h-9 w-full items-center gap-2 rounded-md border-l-2 px-3 text-left text-[13px] transition-colors ${
                  active ? "border-[#5B5BD6] bg-[#F4F4FF]" : "border-transparent hover:bg-[#F4F4F2]"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-[#EBEBEB] bg-[#F9F9F7]/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-semibold leading-[1.3]">PYQ intelligence</h1>
              <p className="text-[13px] text-[#888888]">Official-first local index for Class 12 Commerce.</p>
            </div>
            <div className="flex gap-2 md:hidden">
              {nav.map((item) => (
                <Button key={item.id} variant={tab === item.id ? "primary" : "secondary"} onClick={() => setTab(item.id)}>
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        <div className="px-4 py-6 md:px-8">
          {tab === "dashboard" && <Dashboard trends={trends} />}
          {tab === "browse" && (
            <Browse
              questions={questions}
              search={search}
              setSearch={setSearch}
              subject={subject}
              setSubject={setSubject}
              type={type}
              setType={setType}
              marks={marks}
              setMarks={setMarks}
            />
          )}
          {tab === "practice" && <Practice questions={questions.filter((question) => question.questionType === "mcq")} />}
          {tab === "sources" && <Sources />}
          {tab === "settings" && <SettingsPage />}
        </div>
      </section>
    </main>
  );
}

function Dashboard({ trends }: { trends: Trends | null }) {
  if (!trends) return <p className="text-[13px] text-[#888888]">Loading trends...</p>;
  const stats = [
    ["Questions", trends.totals.questions],
    ["Paper sources", trends.totals.papers],
    ["Repeated clusters", trends.totals.repeatedClusters],
    ["Weighted appearances", trends.totals.weightedRepeats]
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <Panel key={label} className="p-4">
            <div className="text-[13px] text-[#888888]">{label}</div>
            <div className="mt-2 text-[24px] font-semibold">{value}</div>
          </Panel>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel className="p-4">
          <h2 className="mb-4 text-[18px] font-semibold">Chapter frequency</h2>
          <div className="space-y-3">
            {trends.chapters.map((row) => (
              <div key={`${row.subject}-${row.chapter}`}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>{row.subject} · {row.chapter}</span>
                  <span className="text-[#888888]">{row.appearances} appearances</span>
                </div>
                <div className="h-2 rounded-sm bg-[#F4F4F2]">
                  <div className="h-2 rounded-sm bg-[#5B5BD6]" style={{ width: `${Math.min(100, row.appearances * 20)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <h2 className="mb-4 text-[18px] font-semibold">Repeated question clusters</h2>
          <div className="space-y-3">
            {trends.topClusters.length === 0 && <p className="text-[13px] text-[#888888]">No repeats yet. Single-appearance questions are hidden here.</p>}
            {trends.topClusters.map((cluster) => (
              <div key={cluster.id} className="border-b border-[#EBEBEB] pb-3 last:border-0">
                <div className="text-[13px] font-medium">{cluster.canonicalText}</div>
                <div className="mt-1 text-[13px] text-[#888888]">
                  {cluster.repeatCount} times · {cluster.firstYear}-{cluster.lastYear} · {Math.round(cluster.confidence * 100)}% match
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel className="p-4">
        <h2 className="mb-4 text-[18px] font-semibold">Marks segmentation</h2>
        <div className="grid gap-3 md:grid-cols-6">
          {trends.marksBreakdown.map((row) => (
            <div key={row.marks} className="rounded-md border border-[#EBEBEB] p-3">
              <div className="text-[13px] text-[#888888]">{row.marks} mark{row.marks === 1 ? "" : "s"}</div>
              <div className="mt-1 text-[22px] font-semibold">{row.questions}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Browse({
  questions,
  search,
  setSearch,
  subject,
  setSubject,
  type,
  setType,
  marks,
  setMarks
}: {
  questions: Question[];
  search: string;
  setSearch: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  marks: string;
  setMarks: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Panel className="p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_180px_160px_140px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[#888888]" size={15} />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search question, topic, chapter..." className="pl-9" />
          </div>
          <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value="all">All subjects</option>
            <option value="accountancy">Accountancy</option>
            <option value="business-studies">Business Studies</option>
            <option value="economics">Economics</option>
            <option value="maths">Maths</option>
            <option value="english">English</option>
          </Select>
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All types</option>
            <option value="mcq">MCQ</option>
            <option value="assertion_reason">Assertion Reason</option>
            <option value="statement_based_mcq">Statement MCQ</option>
            <option value="diagram_mcq">Diagram MCQ</option>
            <option value="fill_in_blank">Fill in blank</option>
            <option value="true_false">True/False</option>
            <option value="match_following">Match following</option>
            <option value="scenario_based">Scenario based</option>
            <option value="cbq">CBQ</option>
            <option value="table">Table</option>
            <option value="graph_based">Graph based</option>
            <option value="analytical">Analytical</option>
            <option value="distinguish">Distinguish</option>
            <option value="vi_alternative">VI alternative</option>
            <option value="numerical">Numerical</option>
            <option value="numerical_accountancy">Accountancy numerical</option>
            <option value="short-answer">Short answer</option>
            <option value="short_answer">Short answer tagged</option>
            <option value="long-answer">Long answer</option>
          </Select>
          <Select value={marks} onChange={(event) => setMarks(event.target.value)}>
            <option value="all">All marks</option>
            <option value="1">1 mark</option>
            <option value="2">2 marks</option>
            <option value="3">3 marks</option>
            <option value="4">4 marks</option>
            <option value="5">5 marks</option>
            <option value="6">6 marks</option>
          </Select>
        </div>
      </Panel>
      <div className="space-y-3">
        {questions.map((question) => <QuestionCard key={question.id} question={question} />)}
      </div>
    </div>
  );
}

type QuestionBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "options"; options: Array<{ label: string; text: string }> }
  | { type: "image"; alt: string; src: string }
  | { type: "table"; rows: string[][] }
  | { type: "or" };

function cleanQuestionLine(line: string, index: number) {
  let next = line.trim();
  if (index === 0) next = next.replace(/^(?:Q\.?\s*)?\d{1,2}[.)]\s+/, "");
  return next.replace(/\s+([1-6])\s*$/, (match, mark) => (next.length > 80 ? "" : match)).trim();
}

function splitInlineOptions(line: string) {
  const markerPattern = /(?:^|\s)([A-D][.)])\s+/g;
  const matches = [...line.matchAll(markerPattern)];
  if (matches.length < 2) return [line];

  const segments: string[] = [];
  const firstIndex = matches[0].index ?? 0;
  const prefix = line.slice(0, firstIndex).trim();
  if (prefix) segments.push(prefix);

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? line.length : line.length;
    segments.push(line.slice(start, end).trim());
  });
  return segments.filter(Boolean);
}

function optionFromLine(line: string) {
  const match = line.match(/^(?:\(([A-D])\)|([A-D])[.)])\s+(.+)$/);
  if (!match) return null;
  return { label: match[1] ?? match[2], text: match[3].trim() };
}

function imageFromLine(line: string) {
  const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!match) return null;
  return { alt: match[1], src: match[2] };
}

function tableRowFromLine(line: string) {
  if (!line.startsWith("|") || !line.endsWith("|")) return null;
  if (/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|$/.test(line)) return [];
  return line.slice(1, -1).split("|").map((cell) => cell.replaceAll("<br />", "\n").trim());
}

function removeVisibleMarkSuffix(line: string) {
  return line.replace(/\s+([1-6])\s*$/, "").replace(/\s*:\s*$/, ":").trim();
}

function parseQuestionBlocks(text: string): QuestionBlock[] {
  const expandedLines = text
    .split(/\n+/)
    .map((line, index) => cleanQuestionLine(line, index))
    .filter(Boolean)
    .flatMap(splitInlineOptions);
  const lines = expandedLines.map((line, index) => {
    const nextLine = expandedLines[index + 1] ?? "";
    return optionFromLine(nextLine) ? removeVisibleMarkSuffix(line) : line;
  });

  const blocks: QuestionBlock[] = [];
  let paragraph: string[] = [];
  let options: Array<{ label: string; text: string }> = [];
  let tableRows: string[][] = [];

  function flushParagraph() {
    if (paragraph.length) blocks.push({ type: "paragraph", lines: paragraph });
    paragraph = [];
  }

  function flushOptions() {
    if (options.length) blocks.push({ type: "options", options });
    options = [];
  }

  function flushTable() {
    if (tableRows.length) blocks.push({ type: "table", rows: tableRows });
    tableRows = [];
  }

  for (const line of lines) {
    if (/^OR$/i.test(line)) {
      flushParagraph();
      flushOptions();
      flushTable();
      blocks.push({ type: "or" });
      continue;
    }

    const image = imageFromLine(line);
    if (image) {
      flushParagraph();
      flushOptions();
      flushTable();
      blocks.push({ type: "image", ...image });
      continue;
    }

    const tableRow = tableRowFromLine(line);
    if (tableRow) {
      flushParagraph();
      flushOptions();
      tableRows.push(tableRow);
      continue;
    }
    if (tableRow !== null) continue;

    const option = optionFromLine(line);
    if (option) {
      flushParagraph();
      flushTable();
      options.push(option);
      continue;
    }

    if (options.length) {
      options[options.length - 1].text = `${options[options.length - 1].text} ${line}`.trim();
      continue;
    }
    flushTable();
    paragraph.push(line);
  }

  flushParagraph();
  flushOptions();
  flushTable();
  return blocks;
}

function QuestionText({ text, compact = false }: { text: string; compact?: boolean }) {
  const blocks = parseQuestionBlocks(text);
  return (
    <div className={`question-markdown space-y-3 ${compact ? "text-[15px]" : "text-[15px]"}`}>
      {blocks.map((block, index) => {
        if (block.type === "or") {
          return (
            <div key={`or-${index}`} className="flex items-center gap-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#888888]">
              <span className="h-px flex-1 bg-[#EBEBEB]" />
              OR
              <span className="h-px flex-1 bg-[#EBEBEB]" />
            </div>
          );
        }
        if (block.type === "options") {
          return (
            <div key={`options-${index}`} className="grid gap-2 md:grid-cols-2">
              {block.options.map((option, optionIndex) => (
                <div key={`${index}-${optionIndex}-${option.label}`} className="flex min-h-11 gap-3 rounded-md border border-[#EBEBEB] bg-white px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#D8D8D8] bg-[#F9F9F7] text-[12px] font-semibold">
                    {option.label}
                  </span>
                  <span className="leading-[1.45]">{option.text}</span>
                </div>
              ))}
            </div>
          );
        }
        if (block.type === "image") {
          return (
            <figure key={`image-${index}`} className="overflow-hidden rounded-md border border-[#EBEBEB] bg-white p-2">
              <img src={block.src} alt={block.alt} className="mx-auto max-h-[360px] w-auto max-w-full object-contain" />
            </figure>
          );
        }
        if (block.type === "table") {
          return (
            <div key={`table-${index}`} className="overflow-x-auto">
              <table>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${index}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => rowIndex === 0 ? (
                        <th key={cellIndex}>{cell}</th>
                      ) : (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div key={`paragraph-${index}`} className={compact ? "leading-[1.5]" : "leading-[1.65]"}>
            {block.lines.map((line, lineIndex) => (
              <p key={`${index}-${lineIndex}`} className={lineIndex > 0 ? "mt-1" : undefined}>
                {line}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function getQuestionOptions(text: string) {
  return parseQuestionBlocks(text).flatMap((block) => (block.type === "options" ? block.options : []));
}

function QuestionCard({ question }: { question: Question }) {
  const [open, setOpen] = useState(false);
  const [aiSolution, setAiSolution] = useState(question.aiSolution);
  const [loadingAi, setLoadingAi] = useState(false);

  async function requestAiSolution() {
    setLoadingAi(true);
    try {
      const response = await fetch("/api/solutions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: question.id })
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) as { contentMarkdown?: string; error?: string } : {};
      setAiSolution(data.contentMarkdown ?? data.error ?? `Solution request failed (${response.status}).`);
    } catch (error) {
      setAiSolution(error instanceof Error ? error.message : "Solution request failed.");
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <Panel className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-[#888888]">
        <span>{question.subjectName}</span>
        <span>·</span>
        <span>{question.chapterName}</span>
        {question.topicName && <span>· {question.topicName}</span>}
        <span className="ml-auto rounded-md border border-[#EBEBEB] px-2 py-0.5">{question.marks} marks</span>
      </div>
      <QuestionText text={question.markdown} />
      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
        <span className="rounded-md bg-[#F4F4F2] px-2 py-1">{question.repeatCount} appearances</span>
        <span className="rounded-md bg-[#F4F4F2] px-2 py-1">{question.marks} mark{question.marks === 1 ? "" : "s"}</span>
        <span className="rounded-md bg-[#F4F4F2] px-2 py-1">{question.questionType}</span>
        <span className="rounded-md bg-[#F4F4F2] px-2 py-1">{question.difficulty}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={() => setOpen(!open)}>{open ? "Hide details" : "Show details"}</Button>
        {!aiSolution && <Button variant="ghost" onClick={requestAiSolution} disabled={loadingAi}><Sparkles size={15} /> {loadingAi ? "Checking..." : "Check solution"}</Button>}
      </div>
      {open && (
        <div className="mt-4 space-y-4 border-t border-[#EBEBEB] pt-4">
          <div>
            <h3 className="mb-2 text-[13px] font-semibold">Occurrences</h3>
            {question.occurrences.length === 0 ? <p className="text-[13px] text-[#888888]">No occurrences linked yet.</p> : question.occurrences.map((occurrence) => (
              <div key={occurrence.id} className="mb-2 rounded-md border border-[#EBEBEB] p-3 text-[13px]">
                <div className="font-medium">{occurrence.year} · {occurrence.setName} · Q{occurrence.questionNumber}</div>
                <a className="mt-1 block break-all text-[#5B5BD6]" href={occurrence.sourceUrl} target="_blank" rel="noreferrer">{occurrence.sourceUrl}</a>
                {occurrence.wordingDelta && <div className="mt-1 text-[#888888]">Change: {occurrence.wordingDelta}</div>}
              </div>
            ))}
          </div>
          {question.officialSolution && (
            <div className="whitespace-pre-wrap rounded-md bg-[#F4F4F2] p-3 text-[13px]">
              <div className="mb-1 font-semibold">Official answer</div>
              {question.officialSolution}
            </div>
          )}
          {aiSolution && (
            <div className="rounded-md border border-[#F59E0B] bg-white p-3 text-[13px] whitespace-pre-wrap">
              <div className="mb-1 font-semibold">AI draft · verify before trusting</div>
              {aiSolution}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function SettingsPage() {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [model, setModel] = useState("auto");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((response) => response.json()).then((settings) => {
      setUrl(settings.ninerouterUrl ?? "");
      setModel(settings.ninerouterModel ?? "auto");
      setKey(settings.hasNinerouterKey ? "••••••••" : "");
    });
  }, []);

  async function save() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ninerouterUrl: url, ninerouterKey: key === "••••••••" ? "" : key, ninerouterModel: model })
    });
    setStatus("Saved locally.");
  }

  return (
    <Panel className="max-w-2xl p-4">
      <h2 className="mb-1 text-[18px] font-semibold">Model settings</h2>
      <p className="mb-4 text-[13px] text-[#888888]">Used for AI draft answers, tagging, and later clustering. Stored locally in SQLite.</p>
      <div className="space-y-3">
        <label className="block text-[13px] font-medium">
          9Router URL
          <Input className="mt-1" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
        </label>
        <label className="block text-[13px] font-medium">
          API key
          <Input className="mt-1" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Optional" type="password" />
        </label>
        <label className="block text-[13px] font-medium">
          Model
          <Input className="mt-1" value={model} onChange={(event) => setModel(event.target.value)} placeholder="auto" />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save}>Save settings</Button>
        {status && <span className="text-[13px] text-[#888888]">{status}</span>}
      </div>
    </Panel>
  );
}

function Practice({ questions }: { questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [responses, setResponses] = useState<Array<{ questionId: string; selectedOption?: string; correctOption?: string; status: string; secondsSpent: number }>>([]);
  const current = questions[index];
  const done = questions.length > 0 && index >= questions.length;

  useEffect(() => {
    setStartedAt(Date.now());
    setSelected(null);
    setSubmitted(false);
  }, [index]);

  async function finish(nextResponses = responses) {
    const totalSeconds = nextResponses.reduce((sum, response) => sum + response.secondsSpent, 0);
    await fetch("/api/practice/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "chapter-mcq", responses: nextResponses, totalSeconds })
    });
    setIndex(questions.length);
  }

  function submit(status: "correct" | "wrong" | "skipped") {
    if (!current) return;
    const next = [...responses, { questionId: current.id, selectedOption: selected ?? undefined, correctOption: "B", status, secondsSpent: Math.round((Date.now() - startedAt) / 1000) }];
    setResponses(next);
    setSubmitted(true);
    if (index === questions.length - 1) void finish(next);
  }

  if (questions.length === 0) {
    return <Panel className="p-6 text-[13px] text-[#888888]">No MCQs are available yet. The extractor/importer will populate this from official papers.</Panel>;
  }

  if (done) {
    const correct = responses.filter((response) => response.status === "correct").length;
    const skipped = responses.filter((response) => response.status === "skipped").length;
    return (
      <Panel className="mx-auto max-w-2xl p-6">
        <h2 className="text-[24px] font-semibold">done.</h2>
        <p className="mt-4 text-[18px]">{correct} / {responses.length} correct</p>
        <p className="text-[13px] text-[#888888]">Skipped {skipped} · total time {formatSeconds(responses.reduce((sum, response) => sum + response.secondsSpent, 0))}</p>
      </Panel>
    );
  }

  return (
    <Panel className="mx-auto max-w-3xl p-5">
      <div className="mb-5 flex justify-between border-b border-[#EBEBEB] pb-3 text-[13px]">
        <span>{current.subjectName} · Q {index + 1} of {questions.length}</span>
        <span>{current.marks} mark</span>
      </div>
      <QuestionText text={current.markdown} compact />
      <div className="space-y-2">
        {(getQuestionOptions(current.markdown).slice(0, 4).length ? getQuestionOptions(current.markdown).slice(0, 4) : ["A", "B", "C", "D"].map((label) => ({ label, text: label }))).map((option) => (
          <button
            key={option.label}
            onClick={() => setSelected(option.label)}
            className={`flex h-11 w-full items-center rounded-md border px-3 text-left text-[15px] transition-colors ${
              selected === option.label ? "border-[#5B5BD6] bg-[#F4F4FF]" : "border-[#EBEBEB] bg-white hover:bg-[#F4F4F2]"
            }`}
          >
            <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[#D8D8D8] text-[12px] font-semibold">{option.label}</span>
            <span>{option.text}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-between">
        <Button variant="secondary" onClick={() => submit("skipped")}>Skip</Button>
        {submitted ? <Button onClick={() => setIndex(index + 1)}>Next</Button> : <Button onClick={() => submit(selected === "B" ? "correct" : "wrong")} disabled={!selected}>Submit</Button>}
      </div>
    </Panel>
  );
}

function Sources() {
  const [manifest, setManifest] = useState<{
    activePath: string;
    reviewRequired: boolean;
    sources: Array<{ subject: string; subjectName?: string; academicSession?: string; year: number; paperType?: string; sourceUrl: string; status: string; trustLevel: string }>;
    downloadLog?: { counts: Record<string, number> } | null;
    extractionReport?: { papers: number; questions: number; needsReview: number } | null;
  } | null>(null);
  useEffect(() => {
    fetch("/api/manifest").then((response) => response.json()).then(setManifest);
  }, []);

  return (
    <Panel className="p-4">
      <h2 className="mb-1 text-[18px] font-semibold">Source manifest review</h2>
      <p className="mb-4 text-[13px] text-[#888888]">Downloader creates this before bulk PDF download so sources can be checked first.</p>
      {manifest && (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-[#EBEBEB] p-3 text-[13px]">
            <div className="text-[#888888]">Manifest</div>
            <div className="mt-1 font-medium">{manifest.activePath}</div>
          </div>
          <div className="rounded-md border border-[#EBEBEB] p-3 text-[13px]">
            <div className="text-[#888888]">Review gate</div>
            <div className="mt-1 font-medium">{manifest.reviewRequired ? "Locked" : "Approved"}</div>
          </div>
          <div className="rounded-md border border-[#EBEBEB] p-3 text-[13px]">
            <div className="text-[#888888]">Downloads</div>
            <div className="mt-1 font-medium">{manifest.downloadLog?.counts.downloaded ?? 0} downloaded</div>
          </div>
          <div className="rounded-md border border-[#EBEBEB] p-3 text-[13px]">
            <div className="text-[#888888]">Extracted</div>
            <div className="mt-1 font-medium">{manifest.extractionReport?.questions ?? 0} questions</div>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {manifest?.sources.map((source) => (
          <div key={`${source.subject}-${source.year}-${source.sourceUrl}`} className="rounded-md border border-[#EBEBEB] p-3 text-[13px]">
            <div className="font-medium">{source.subjectName ?? source.subject} · {source.academicSession ?? source.year} · {source.paperType ?? "source"} · {source.trustLevel}</div>
            <div className="mt-1 break-all text-[#888888]">{source.sourceUrl}</div>
            <div className="mt-1 text-[#888888]">Status: {source.status}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
