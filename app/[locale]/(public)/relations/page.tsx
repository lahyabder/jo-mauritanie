'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import dynamic from 'next/dynamic';
import { Network, Filter, Search } from 'lucide-react';

// ForceGraph2D must be imported dynamically with ssr: false because it uses window/canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// Mock data to demonstrate the Knowledge Graph structure before Supabase is populated
const MOCK_GRAPH_DATA = {
  nodes: [],
  links: []
};

export default function KnowledgeGraphPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = use(params);
  const isAr = resolvedParams.locale === 'ar';
  const [data, setData] = useState(MOCK_GRAPH_DATA);
  const [windowReady, setWindowReady] = useState(false);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    setWindowReady(true);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    // Center view on the node when clicked
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(8, 2000);
    }
  }, [fgRef]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header Panel */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center">
          <div className="p-2 bg-indigo-50 rounded-lg mr-3 ms-0 me-3">
            <Network className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isAr ? 'مستكشف المعرفة القانونية' : 'Legal Knowledge Graph'}</h1>
            <p className="text-xs text-gray-500">{isAr ? 'شبكة العلاقات بين القوانين، المراسيم، الأشخاص والمؤسسات' : 'Network of relations between laws, decrees, persons, and institutions'}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-2">
           <div className="relative">
            <input 
              type="text" 
              placeholder={isAr ? 'ابحث عن عقدة...' : 'Search node...'}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 rtl:right-3 rtl:left-auto" />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 mr-2 ml-2 text-gray-500" />
            {isAr ? 'فلاتر' : 'Filters'}
          </button>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 bg-gray-50 relative overflow-hidden">
        {windowReady && (
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={6}
            linkColor="color"
            linkWidth={1.5}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 6, bckgDimensions[0], bckgDimensions[1]);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = node.color;
              ctx.fillText(label, node.x, node.y + 6 + (bckgDimensions[1]/2));

              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val ? Math.sqrt(node.val) : 4, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();
            }}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link: any, ctx, globalScale) => {
              // Draw relationship label
              const MAX_FONT_SIZE = 4;
              const LABEL_NODE_MARGIN = (node: any) => Math.sqrt(node.val || 4) * 1.5;

              const start = link.source;
              const end = link.target;

              // ignore unbound links
              if (typeof start !== 'object' || typeof end !== 'object') return;

              // calculate label positioning
              const textPos = {
                x: start.x + (end.x - start.x) / 2,
                y: start.y + (end.y - start.y) / 2
              };

              const relLink = { x: end.x - start.x, y: end.y - start.y };
              const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN(start) - LABEL_NODE_MARGIN(end);

              let textAngle = Math.atan2(relLink.y, relLink.x);
              // maintain label vertical orientation for legibility
              if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
              if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

              const label = link.label;

              // estimate fontSize to fit in link length
              ctx.font = '1px Sans-Serif';
              const fontSize = Math.min(MAX_FONT_SIZE, maxTextLength / ctx.measureText(label).width);
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

              // draw text label (with background)
              ctx.save();
              ctx.translate(textPos.x, textPos.y);
              ctx.rotate(textAngle);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillRect(- bckgDimensions[0] / 2, - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = link.color || '#9ca3af';
              ctx.fillText(label, 0, 0);
              ctx.restore();
            }}
          />
        )}
        
        {/* Legend */}
        <div className="absolute bottom-6 right-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-2 pointer-events-none">
          <p className="text-xs font-bold text-gray-900 mb-1">{isAr ? 'مفتاح الخريطة' : 'Legend'}</p>
          <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-[#4f46e5]"></span> {isAr ? 'قانون' : 'Law'}</div>
          <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span> {isAr ? 'مرسوم/قرار' : 'Decree'}</div>
          <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> {isAr ? 'شخصية' : 'Person'}</div>
          <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span> {isAr ? 'مؤسسة' : 'Institution'}</div>
          <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full bg-[#ec4899]"></span> {isAr ? 'موضوع قانوني' : 'Legal Topic'}</div>
        </div>
      </div>
    </div>
  );
}
