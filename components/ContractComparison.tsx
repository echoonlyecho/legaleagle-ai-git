
import React, { useState, useMemo } from 'react';
import { GitCompare, UploadCloud, Trash2, ArrowRight, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import * as Diff from 'diff';

export const ContractComparison: React.FC = () => {
    const [textA, setTextA] = useState('');
    const [textB, setTextB] = useState('');
    const [fileNameA, setFileNameA] = useState('');
    const [fileNameB, setFileNameB] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [viewMode, setViewMode] = useState<'inline' | 'split'>('inline');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            setIsProcessing(true);

            const processFile = (content: string) => {
                if (target === 'A') {
                    setTextA(content);
                    setFileNameA(file.name);
                } else {
                    setTextB(content);
                    setFileNameB(file.name);
                }
                setIsProcessing(false);
            };

            if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                reader.onload = async (event) => {
                    try {
                        const arrayBuffer = event.target?.result as ArrayBuffer;
                        let mammoth = (window as any).mammoth;
                        if (mammoth?.extractRawText) {
                            const result = await mammoth.extractRawText({ arrayBuffer });
                            processFile(result.value);
                        } else {
                            alert("Mammoth 加载失败");
                            setIsProcessing(false);
                        }
                    } catch (error) {
                        alert("解析失败");
                        setIsProcessing(false);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else if (file.name.endsWith('.pdf')) {
                reader.onload = async (event) => {
                    try {
                        const arrayBuffer = event.target?.result as ArrayBuffer;
                        const pdfjsLib = (window as any).pdfjsLib;
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                        }
                        processFile(fullText);
                    } catch (error) {
                        alert("PDF 解析失败");
                        setIsProcessing(false);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                reader.onload = (event) => processFile(event.target?.result as string);
                reader.readAsText(file);
            }
        }
    };

    const diffResult = useMemo(() => {
        if (!textA || !textB) return null;
        try {
            // Use diffWords for finer granularity in legal text
            // @ts-ignore
            const diffFn = Diff.diffWords || Diff.default?.diffWords;
            return diffFn ? diffFn(textA, textB) : [];
        } catch (e) {
            return [];
        }
    }, [textA, textB]);

    const stats = useMemo(() => {
        if (!diffResult) return { added: 0, removed: 0 };
        return diffResult.reduce((acc, part) => {
            if (part.added) acc.added += part.value.length;
            if (part.removed) acc.removed += part.value.length;
            return acc;
        }, { added: 0, removed: 0 });
    }, [diffResult]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 bg-white shrink-0 shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <GitCompare className="w-6 h-6 text-blue-600" />
                        合同比对分析
                    </h2>
                    <p className="text-gray-500 mt-1">对比两个版本的文本差异，精准识别修改、新增与删除内容。</p>
                </div>
                {diffResult && (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('inline')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'inline' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            行内模式
                        </button>
                        <button 
                            onClick={() => setViewMode('split')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'split' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            分栏模式
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
                {/* Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
                    <div className={`p-6 bg-white rounded-xl border-2 border-dashed transition-all relative ${textA ? 'border-green-200 bg-green-50/10' : 'border-gray-200 hover:border-blue-400'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                合同版本 A (基准)
                            </h3>
                            {textA && (
                                <button onClick={() => { setTextA(''); setFileNameA(''); }} className="text-gray-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {textA ? (
                            <div className="text-sm font-medium text-green-700 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {fileNameA || '文本已就绪'} ({textA.length} 字符)
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4 relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'A')} accept=".txt,.md,.doc,.docx,.pdf" />
                                <UploadCloud className="w-8 h-8 text-blue-400 mb-2" />
                                <p className="text-xs text-gray-500 text-center">点击上传或直接粘贴内容于下方</p>
                            </div>
                        )}
                        {!textA && (
                            <textarea 
                                className="w-full mt-4 p-3 border border-gray-200 rounded-lg h-32 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="或者在此粘贴版本 A 的文本..."
                                onChange={(e) => setTextA(e.target.value)}
                            />
                        )}
                    </div>

                    <div className={`p-6 bg-white rounded-xl border-2 border-dashed transition-all relative ${textB ? 'border-blue-200 bg-blue-50/10' : 'border-gray-200 hover:border-blue-400'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                合同版本 B (对比)
                            </h3>
                            {textB && (
                                <button onClick={() => { setTextB(''); setFileNameB(''); }} className="text-gray-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {textB ? (
                            <div className="text-sm font-medium text-blue-700 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {fileNameB || '文本已就绪'} ({textB.length} 字符)
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4 relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'B')} accept=".txt,.md,.doc,.docx,.pdf" />
                                <UploadCloud className="w-8 h-8 text-blue-400 mb-2" />
                                <p className="text-xs text-gray-500 text-center">点击上传或直接粘贴内容于下方</p>
                            </div>
                        )}
                        {!textB && (
                            <textarea 
                                className="w-full mt-4 p-3 border border-gray-200 rounded-lg h-32 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="或者在此粘贴版本 B 的文本..."
                                onChange={(e) => setTextB(e.target.value)}
                            />
                        )}
                    </div>
                </div>

                {/* Diff Result */}
                <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-6">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">比对结果</span>
                            {diffResult && (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-xs font-medium text-gray-600">新增: {stats.added} 字符</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <span className="text-xs font-medium text-gray-600">删除: {stats.removed} 字符</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {isProcessing ? (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                正在解析文档内容...
                            </div>
                        ) : diffResult ? (
                            viewMode === 'inline' ? (
                                <div>
                                    {diffResult.map((part, idx) => (
                                        <span 
                                            key={idx} 
                                            className={`${
                                                part.added ? 'bg-green-100 text-green-800 ring-1 ring-green-200 rounded-sm' : 
                                                part.removed ? 'bg-red-50 text-red-500 line-through ring-1 ring-red-100 rounded-sm' : 
                                                'text-gray-700'
                                            } transition-all`}
                                        >
                                            {part.value}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-8 divide-x divide-gray-100 h-full">
                                    <div className="pr-4">
                                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-4 sticky top-0 bg-white">版本 A 视图</div>
                                        {diffResult.map((part, idx) => (
                                            !part.added && (
                                                <span key={idx} className={part.removed ? 'bg-red-50 text-red-500 line-through' : 'text-gray-700'}>
                                                    {part.value}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                    <div className="pl-8">
                                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-4 sticky top-0 bg-white">版本 B 视图</div>
                                        {diffResult.map((part, idx) => (
                                            !part.removed && (
                                                <span key={idx} className={part.added ? 'bg-green-100 text-green-800' : 'text-gray-700'}>
                                                    {part.value}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <GitCompare className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-gray-400">请先在上方准备好两个版本的合同文本</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
