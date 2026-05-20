import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ChevronRight, AlertCircle, CheckCircle2, Brain, Eye, Zap } from 'lucide-react';
import type { TraceStep } from '../types';

interface Props {
  steps: TraceStep[];
}

const stepMeta: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  thought: {
    label: 'Thought · 推理',
    icon: <Brain className="h-4 w-4" />,
    color: 'border-l-blue-500 bg-blue-950/20',
  },
  action: {
    label: 'Action · 行动',
    icon: <Zap className="h-4 w-4" />,
    color: 'border-l-emerald-500 bg-emerald-950/20',
  },
  observation: {
    label: 'Observation · 观察',
    icon: <Eye className="h-4 w-4" />,
    color: 'border-l-amber-500 bg-amber-950/20',
  },
  done: {
    label: 'Done · 完成',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'border-l-violet-500 bg-violet-950/20',
  },
};

export function ReactTrace({ steps }: Props) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          Agent ReAct 推理过程
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {steps.map((step, i) => {
          const meta = stepMeta[step.type] || stepMeta.done;
          return (
            <div key={i}>
              <div className={`border-l-2 pl-4 py-3 ${meta.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-5 ${
                      step.type === 'thought' ? 'border-blue-500 text-blue-400' :
                      step.type === 'action' ? 'border-emerald-500 text-emerald-400' :
                      step.type === 'observation' ? 'border-amber-500 text-amber-400' :
                      'border-violet-500 text-violet-400'
                    }`}
                  >
                    {meta.icon}
                    <span className="ml-1">{step.type.toUpperCase()}</span>
                  </Badge>
                  <span className="text-[10px] text-zinc-600">Step {i + 1}</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{step.content}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-4 bg-zinc-800" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
