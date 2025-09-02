
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

type Rec = { label:string; detail:string; kind: "good"|"bad"|"neutral"|"info" };

interface DecisionPanelProps {
  recommendation: Rec;
  onClose: () => void;
}

export function DecisionPanel({ recommendation, onClose }: DecisionPanelProps) {
  const borderColor = recommendation.kind === "good" ? "border-green-500" : recommendation.kind === "bad" ? "border-red-500" : "border-gray-300";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-80 shadow-2xl border-2 ${borderColor} bg-white dark:bg-gray-950`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Action Recommandée</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-2xl font-bold">{recommendation.label}</p>
            <p className="text-sm text-muted-foreground mt-2">{recommendation.detail}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
