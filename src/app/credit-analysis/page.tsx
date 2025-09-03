import { Suspense } from 'react';
import CreditAnalysisContent from '@/components/CreditAnalysisContent';

export default function CreditAnalysisPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <CreditAnalysisContent />
    </Suspense>
  );
}
