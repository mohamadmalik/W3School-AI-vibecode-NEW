import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Code2, 
  TerminalSquare, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Sparkles, 
  Send,
  ChevronRight,
  Play,
  Lightbulb
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- API HELPER FUNCTIONS ---

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL_NAME = "gemini-3-flash-preview";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Helper function to call Gemini API
async function callGemini(prompt, systemInstruction = "") {
  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    };
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) throw new Error("API call failed");
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error: Could not communicate with the gods. Please check your connection or try again later.";
  }
}

export default function CodeDeity() {
  const [topic, setTopic] = useState("");
  const [activeTab, setActiveTab] = useState("learn"); // 'learn' | 'practice'
  const [lessonContent, setLessonContent] = useState("");
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  
  const [challenge, setChallenge] = useState(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  
  const [userCode, setUserCode] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);

  const lessonEndRef = useRef(null);

  const handleLearn = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    setIsGeneratingLesson(true);
    setLessonContent("");
    setChallenge(null);
    setUserCode("");
    setEvaluationResult(null);
    setActiveTab("learn");

    const prompt = `Bertindaklah sebagai tutor coding ahli. Ajarkan pengguna tentang "${topic}" menggunakan BAHASA INDONESIA. 
    Gunakan gaya mengajar yang sangat mirip dengan W3Schools:
    1. Mulai dengan ringkasan singkat dan jelas (seperti bagian "Introduction").
    2. Berikan contoh kode utama ("Example") yang sangat sederhana, bersih, dan mudah dipahami.
    3. Jelaskan setiap baris kode yang penting secara berurutan.
    4. Pecah penjelasan menjadi paragraf pendek atau poin-poin. Jangan bertele-tele.
    5. Gunakan format Markdown. Buat agar terlihat profesional seperti dokumentasi resmi.`;
    
    const response = await callGemini(prompt, "Kamu adalah tutor AI yang mengajar dengan gaya terstruktur dan ringkas seperti W3Schools, menggunakan Bahasa Indonesia.");
    setLessonContent(response);
    setIsGeneratingLesson(false);
  };

  const handleGenerateChallenge = async () => {
    setIsGeneratingChallenge(true);
    
    const prompt = `Berdasarkan topik "${topic}", buatlah sebuah tantangan coding (coding challenge) dalam BAHASA INDONESIA.
    Kembalikan HANYA objek JSON (tanpa format markdown, tanpa backtick, hanya raw JSON) dengan struktur ini:
    {
      "title": "Judul Tantangan Pendek",
      "description": "Instruksi jelas tentang apa yang harus dibuat atau diselesaikan.",
      "language": "Bahasa pemrograman yang disarankan",
      "examples": [{"input": "...", "output": "..."}]
    }`;

    const response = await callGemini(prompt, "Kamu adalah pembuat soal coding. Selalu kembalikan JSON murni dalam Bahasa Indonesia.");
    try {
      const cleanJson = response.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      setChallenge(parsed);
      setUserCode("");
      setEvaluationResult(null);
      setActiveTab("practice");
    } catch (err) {
      console.error("Failed to parse challenge JSON", err);
      setChallenge({
         title: "Ujian Kemampuan",
         description: "Tulis program yang mendemonstrasikan pemahamanmu tentang topik ini.",
         language: "Pilihanmu",
         examples: []
      });
      setActiveTab("practice");
    }
    setIsGeneratingChallenge(false);
  };

  const handleEvaluateCode = async () => {
    if (!userCode.trim() || !challenge) return;
    setIsEvaluating(true);

    const prompt = `Evaluasi kode pengguna ini untuk tantangan: "${challenge.title}".
    Deskripsi tantangan: ${challenge.description}
    
    Kode Pengguna:
    ${userCode}
    
    Berikan feedback dalam BAHASA INDONESIA. Kembalikan HANYA objek JSON (tanpa format markdown, tanpa backtick, hanya raw JSON) dengan struktur ini:
    {
      "isCorrect": boolean,
      "feedback": "Feedback konstruktif, tunjukkan error atau puji logika yang bagus dengan ramah",
      "complexity": "Kompleksitas Waktu/Ruang jika ada, misal O(n) Time, O(1) Space"
    }`;

    const response = await callGemini(prompt, "Kamu adalah evaluator kode. Kembalikan JSON murni dalam Bahasa Indonesia.");
    try {
      const cleanJson = response.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleanJson);
      setEvaluationResult(parsed);
    } catch (err) {
      console.error("Failed to parse evaluation JSON", err);
      setEvaluationResult({
         isCorrect: false,
         feedback: "Sistem bingung dengan format kodemu. Silakan periksa kembali sintaksnya.",
         complexity: "Tidak diketahui"
      });
    }
    setIsEvaluating(false);
  };

  // Custom renderer for ReactMarkdown to handle code blocks beautifully without external libraries
  const MarkdownComponents = {
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <div className="rounded-md overflow-hidden my-4 shadow-lg border border-slate-700 bg-[#1e1e1e]">
          <div className="bg-slate-800 text-slate-400 text-xs py-1.5 px-4 flex justify-between items-center border-b border-slate-700 font-mono">
            <span>{match[1]}</span>
          </div>
          <div className="overflow-x-auto p-4 text-sm font-mono text-[#d4d4d4] leading-relaxed">
            <pre className="!m-0 whitespace-pre-wrap">
              <code {...props}>
                {String(children).replace(/\n$/, '')}
              </code>
            </pre>
          </div>
        </div>
      ) : (
        <code className="bg-slate-800/80 text-teal-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    },
    h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4 text-white border-b border-slate-700 pb-2 flex items-center gap-2" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-6 mb-3 text-slate-200" {...props} />,
    p: ({node, ...props}) => <p className="mb-4 text-slate-300 leading-relaxed" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 text-slate-300 space-y-2" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 text-slate-300 space-y-2" {...props} />,
    li: ({node, ...props}) => <li className="" {...props} />,
    a: ({node, ...props}) => <a className="text-teal-400 hover:text-teal-300 underline" target="_blank" rel="noopener noreferrer" {...props} />,
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-teal-500 pl-4 py-1 italic text-slate-400 my-4 bg-slate-800/30 rounded-r" {...props} />,
    strong: ({node, ...props}) => <strong className="font-bold text-slate-100" {...props} />
  };

  useEffect(() => {
    if (activeTab === 'learn' && lessonContent) {
       lessonEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lessonContent, activeTab]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-teal-400 to-emerald-600 p-2 rounded-lg shadow-lg shadow-teal-500/20">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">
            CodeDeity
          </h1>
        </div>
        <div className="text-sm text-slate-500 font-medium">
          The Infinite Coding Tutor
        </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 gap-6">
        
        {/* Left Column: Search & Lesson */}
        <div className={`flex flex-col w-full ${activeTab === 'practice' ? 'md:w-1/3 lg:w-1/4 hidden md:flex' : 'md:w-1/2 lg:w-3/5'} transition-all duration-300`}>
          
          {/* Search Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-400" />
              Apa yang ingin kamu pelajari hari ini?
            </h2>
            <form onSubmit={handleLearn} className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Cth: C++ Linked Lists, React Hooks, Dasar HTML..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                disabled={isGeneratingLesson}
              />
              <button
                type="submit"
                disabled={!topic.trim() || isGeneratingLesson}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg disabled:opacity-50 disabled:hover:bg-teal-500/10 transition-colors"
              >
                {isGeneratingLesson ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>

          {/* Lesson Content Area */}
          <div className="flex-grow bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {/* Tabs for mobile view when in practice mode to switch back */}
            <div className="flex border-b border-slate-800 p-2 gap-2 bg-slate-900/80">
              <button 
                onClick={() => setActiveTab('learn')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'learn' ? 'bg-slate-800 text-teal-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                <BookOpen className="w-4 h-4" /> Materi
              </button>
              {challenge && (
                 <button 
                 onClick={() => setActiveTab('practice')}
                 className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors md:hidden ${activeTab === 'practice' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
               >
                 <Code2 className="w-4 h-4" /> Latihan
               </button>
              )}
            </div>

            <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {!lessonContent && !isGeneratingLesson && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 text-center px-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                    <Lightbulb className="w-8 h-8 text-slate-400" />
                  </div>
                  <p>Tanyakan topik coding apa saja. Saya akan membuatkan materi sejelas W3Schools untukmu.</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {['Pointers in C', 'Redux Toolkit', 'Dijkstra Algorithm'].map(suggestion => (
                      <button 
                        key={suggestion}
                        onClick={() => setTopic(suggestion)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isGeneratingLesson && (
                <div className="h-full flex flex-col items-center justify-center text-teal-400 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="animate-pulse">Menyusun materi pembelajaran...</p>
                </div>
              )}

              {lessonContent && !isGeneratingLesson && (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown components={MarkdownComponents}>
                    {lessonContent}
                  </ReactMarkdown>
                  <div ref={lessonEndRef} />
                  
                  {/* Action to generate challenge */}
                  <div className="mt-12 pt-6 border-t border-slate-800 flex justify-center">
                    <button
                      onClick={handleGenerateChallenge}
                      disabled={isGeneratingChallenge}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transform transition active:scale-95 disabled:opacity-70"
                    >
                      {isGeneratingChallenge ? (
                         <><Loader2 className="w-5 h-5 animate-spin" /> Menyiapkan Tantangan...</>
                      ) : (
                        <><TerminalSquare className="w-5 h-5" /> Berikan Saya Latihan <ChevronRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Challenge Area */}
        {activeTab === 'practice' && (
          <div className="flex flex-col w-full md:w-2/3 lg:w-3/4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            {challenge ? (
              <div className="flex flex-col h-full">
                
                {/* Challenge Description */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded uppercase tracking-wider">
                      Latihan
                    </span>
                    <h3 className="text-xl font-bold text-white">{challenge.title}</h3>
                  </div>
                  <p className="text-slate-300 mb-4">{challenge.description}</p>
                  
                  {challenge.examples && challenge.examples.length > 0 && (
                    <div className="bg-slate-800/50 rounded-lg p-3 font-mono text-sm border border-slate-700/50">
                      <p className="text-slate-400 mb-1 font-semibold text-xs uppercase tracking-widest">Contoh</p>
                      <div className="text-slate-300">Input:  <span className="text-teal-300">{challenge.examples[0].input}</span></div>
                      <div className="text-slate-300">Output: <span className="text-emerald-300">{challenge.examples[0].output}</span></div>
                    </div>
                  )}
                </div>

                {/* Editor Area */}
                <div className="flex-grow flex flex-col relative group">
                  <div className="absolute top-2 right-4 z-10 px-2 py-1 bg-slate-800 text-slate-400 text-xs rounded opacity-50 group-hover:opacity-100 transition-opacity">
                    {challenge.language}
                  </div>
                  <textarea
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-6 resize-none focus:outline-none"
                    spellCheck="false"
                    placeholder="// Tulis kodemu di sini..."
                  />
                </div>

                {/* Action Bar & Feedback */}
                <div className="border-t border-slate-800 bg-slate-900 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-grow">
                       {/* Feedback Area */}
                       {isEvaluating ? (
                         <div className="flex items-center gap-2 text-teal-400">
                           <Loader2 className="w-5 h-5 animate-spin" />
                           <span className="text-sm animate-pulse">Sistem sedang mengevaluasi kodemu...</span>
                         </div>
                       ) : evaluationResult ? (
                         <div className={`p-4 rounded-xl border ${evaluationResult.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'} flex items-start gap-3`}>
                            {evaluationResult.isCorrect ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <h4 className={`font-bold mb-1 ${evaluationResult.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {evaluationResult.isCorrect ? 'Kode Benar! Kerja Bagus!' : 'Masih Ada yang Kurang Tepat'}
                              </h4>
                              <p className="text-sm text-slate-300 mb-2">{evaluationResult.feedback}</p>
                              {evaluationResult.complexity && (
                                <p className="text-xs text-slate-400 font-mono bg-slate-950/50 inline-block px-2 py-1 rounded">
                                  Kompleksitas: {evaluationResult.complexity}
                                </p>
                              )}
                            </div>
                         </div>
                       ) : null}
                    </div>

                    <button
                      onClick={handleEvaluateCode}
                      disabled={isEvaluating || !userCode.trim()}
                      className="shrink-0 flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 rounded-xl font-bold shadow-lg shadow-teal-500/20 transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                    >
                      <Play className="w-5 h-5 fill-slate-950" /> Jalankan Kode
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Code2 className="w-16 h-16 mb-4 opacity-20" />
                <p>Buat materi terlebih dahulu untuk membuka latihan.</p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

