import React, { useState } from 'react';
import { JINJA_TEMPLATES, JinjaTemplateFile } from '../../data/templatesData';
import {
  Code2, Copy, Check, Download, FileCode, Search,
  ExternalLink, Layers, ArrowRight, CheckCircle2
} from 'lucide-react';

export const JinjaTemplatesExplorer: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<JinjaTemplateFile>(JINJA_TEMPLATES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedTemplate.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = selectedTemplate.path.split('/').pop() || 'template.html';
    const blob = new Blob([selectedTemplate.code], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTemplates = JINJA_TEMPLATES.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
              Flask Jinja2 Deliverables Hub
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            HTML Templates & Frontend Code Inspector
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Production-ready Jinja2 HTML templates styled with Tailwind CSS, ready to drop straight into your Flask backend <code className="text-amber-300">templates/</code> folder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Template Code'}
          </button>
          <button
            onClick={handleDownload}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Download .html
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: List on Left, Code Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Template Selector List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search templates or routes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredTemplates.map(tmpl => {
              const isSelected = selectedTemplate.path === tmpl.path;
              return (
                <div
                  key={tmpl.path}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs truncate">{tmpl.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tmpl.route}
                    </span>
                  </div>
                  <span className={`text-[11px] block truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {tmpl.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Code Preview Viewer */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Metadata Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Target File Path</span>
                <span className="text-sm font-bold font-mono text-slate-900">{selectedTemplate.path}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block sm:text-right">Backend Flask Route</span>
                <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedTemplate.route}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">{selectedTemplate.description}</p>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-medium">Flask Variables Handled:</span>
              {selectedTemplate.flaskContext.map((v, i) => (
                <span key={i} className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800 text-[10px]">
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Code Body */}
          <div className="relative bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto max-h-[580px] scrollbar-thin scrollbar-thumb-slate-800">
            <pre className="whitespace-pre">
              <code>{selectedTemplate.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
